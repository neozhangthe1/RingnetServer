# Create your views here.
from django.http import HttpResponse
from django.shortcuts import render_to_response
import pymongo
import json
import random
import pickle
from RingNetServer import settings
from RingNetServer.database import mysql
from RingNetServer.database import redispy
from RingNetServer.database import mongo
from RingNetServer import algorithm
from RingNetServer import preprocess
import numpy as np
from sklearn import cluster
import os
from collections import defaultdict

authors = [324696,162800,113059,412623,496532,406745,379284,745329,265966]
names= ["Anil K. Jain","Hector Garcia Molina","Christos Papadimitriou",
        "J. D. Ullman","Lotfi Asker Zadeh","Hai Jin",
        "Bjorn Hartmann","Jiawei Han","Philip S. Yu"]

authors = [745329,265966,575748]
names= ["Jiawei Han","Philip S. Yu","Yizhou Sun"]
at_col = pymongo.Connection('10.1.1.110',12345)['ringnet']['author_topic']
topics_label = []
topic_f = open(os.path.join(settings.RES[0],"tw.txt").replace('\\','/'))
topic_map_f = open(os.path.join(settings.RES[0],"match2.txt").replace('\\','/'))
topic_map = [int(line) for line in topic_map_f]

alphabet_f = open(os.path.join(settings.RES[0],"alphabet.txt").replace('\\','/'))
topic_dis_f = open(os.path.join(settings.RES[0],"topics.txt").replace('\\','/'))
#alphabet_f = open("alphabet.txt")
#topic_dis_f = open("topics.txt")
alphabet = []
print "hello"
word_dis = defaultdict(lambda: [0.0 for i in range(200)])
topic_dis = defaultdict(lambda: {})
for line in alphabet:
    alphabet.append(line.strip())
inx = 0
for line in topic_dis_f:
    x = line.strip().split(',')
    for y in x:
        if y == "":
            continue
        z = y.split(":")
        word_dis[int(z[0])][inx] = int(float(z[1]))
        topic_dis[inx][int(z[0])] = int(float(z[1]))
    inx+=1
print type(word_dis)


for line in topic_f:
    x = line.split(' ')
    t = []
    for y in x:
        t.append(y)
    topics_label.append(t)
topic_adj = pickle.load(open(os.path.join(settings.RES[0],"topic_adj_w.pickle").replace('\\','/')))
author_topic = pickle.load(open(os.path.join(settings.RES[0],"selected_author_topics.pickle").replace('\\','/')))



def get_top_authors(topics, lim):
    import redis 
    redis_client = redis.StrictRedis(host="arnetminer.org",db=0)
    authors = set()
    for t in topics:
        authors = authors.union(set(redis_client.zrevrange("AuthorFeature:hindex:t"+str(t),0,lim)))
    return authors

def gen_pattern():
    pass

def get_dyad():
    mysql_client = mysql.Mysql()
    mongo_client = mongo.Mongo()
    authors = {}
    dyad = []
    cur = mysql_client.get_tight_relation()
    for item in cur:
        if item[0] not in authors:
            print item[0]
            a = mongo_client.get_author(item[0])
            if a!=None:
                authors[item[0]] = a
            else:
                continue
        if item[1] not in authors:
            print item[1]
            a = mongo_client.get_author(item[1])
            if a!=None:
                authors[item[1]] = a
            else:
                continue
        dyad.append(item)
    return authors, dyad

def get_topic_item_link(years,n_tuple = 2,n_topics = 200):
    items = []
    links = []
    if n_tuple == 1:
        pass
    elif n_tuple == 2:
        authors, dyad = get_dyad()
        for item in dyad:
            y_dict = [{} for i in range(n_tuple)]
            for i in range(n_tuple):
                index = 0
                for y in authors[item[i]]['topics']['years']:
                    y_dict[i][y] = index
                    index+=1
            weight_dict = defaultdict(lambda : [0.0 for i in range(n_topics)])
            for y in years:
                for i in range(n_tuple):
                    if y in y_dict[i][y]:
                        for t in range(n_topics):
                            weigth_dict[y] += item[i]['topics']['all'][y_dict[i][y]][t]
               
def cluster_topics_aff(topics):
    if len(topics)<=10:
        return [[x] for x in topics]
    adj = np.array([[0.0 for i in range(len(topics))] for j in range(len(topics))])
    for i in range(len(topics)):
        for j in range(i+1,len(topics)):
            adj[i][j] = topic_adj[topics[i]][topics[j]]
            adj[j][i] = topic_adj[topics[j]][topics[i]]
            if adj[i][j]!=adj[j][i]:
                print "%s %s" %(adj[i][j],adj[j][i])
    af = cluster.AffinityPropagation(affinity='precomputed').fit(adj)
    sp = af.labels_
    #sp = cluster.spectral_clustering(adj, n_clusters = 10)
    labels = {}
    for i in range(len(sp)):
        if not sp[i] in labels:
            labels[sp[i]] = []
        labels[sp[i]].append(topics[i])
    sorted_labels = sorted(labels.items(),key=lambda x:len(x[1]),reverse=True)
    labels = {}
    for i in range(8):
        labels[i] = sorted_labels[i][1]
    return labels        

def normalization(authors):
    for a in authors:
        for y in authors[a]:
            s = sum(authors[a][y])
            for i in range(len(authors[a][y])):
                authors[a][y][i]/=s
    return authors

def cluster_author_by_topic_dist(authors,years):
    author_index = {}
    index = 0
    n_topic = len(authors.values()[0].values()[0])
    for a in authors:
        author_index[a] = index
        index+=1
    clusters = defaultdict(lambda: defaultdict(list))
    clusters_dict = defaultdict(lambda: defaultdict(list))
    cluster_center = {}
    for y in years:
        features = np.array([[0.0 for i in range(n_topic)] for j in range(len(authors))])
        for a in authors:
            for i in range(len(authors[a][y])):
                features[author_index[a],i] = authors[a][y][i]
        kmeans = cluster.KMeans(n_clusters = 10)
        res = kmeans.fit_predict(features)
        cluster_center[y] = [list(x) for x in kmeans.cluster_centers_]
        for i in range(len(res)):
            clusters[y][res[i]].append(author_index.keys()[i])
            clusters_dict[author_index.keys()[i]][y] = res[i]
    return clusters,clusters_dict,cluster_center


def get_author_weight(authors,topics,years):
    author_topic_dist = defaultdict(lambda: defaultdict(lambda: [0.0 for i in range(len(topics))]))
    for a in authors:
        flag = 0
        year2index = {}
        for i in range(len(a['topics']['years'])):
            year2index[a['topics']['years'][i]] = i
        #lambda y, s = lambda x: x-1: year2index[y] if y in year2index year2index[s(y)]
        for y in years:
            if not y in year2index:
                x = y
                while x>=years[0] and not x in year2index:
                    x-=1
                if x < years[0]:
                    x = y
                    while x<=years[-1] and not x in year2index:
                        x+=1
                if not x in year2index:
                    flag = 1
                    break
                year2index[y] = year2index[x]
        if flag != 0:
            print a["_id"]
            continue
        #for y in years:
        #    if not y in year2index:
        #        flag = 1
        #        break
        #if flag == 1:
        #    continue
        for y in years:
            for i in range(len(topics)):
                #print i
                author_topic_dist[a['_id']][y][i] = a['topics']['all'][year2index[y]][topics[i]]
    print len(author_topic_dist)
    return author_topic_dist

def get_topic_by_author(pid):
    mysql_client = mysql.Mysql()
    network = mysql_client.get_two_hop_network(pid)
    return network

def render_topic_word(request):
    mysql_client = mysql.Mysql()
    mongo_client = mongo.Mongo()
    smooth = "smooth"
    try:
        smooth = request.GET['smooth']
    except:
        pass
    start_year = int(request.GET['start'])
    end_year = int(request.GET['end'])
    author = request.GET['author']
    authors = get_topic_by_author(author)
    topic_set = set()
    author_set = []
    years = range(start_year,end_year)
    at_col = pymongo.Connection("10.1.1.110",12345)['ringnet']['author_topic']
    for a in authors:
        try:
            cur = at_col.find({"_id":int(a)})
            item = cur.next()
            author_set.append(item)
            year2index = {}
            for i in range(len(item['topics']['years'])):
                year2index[item['topics']['years'][i]] = i
            for y in years:
                if y in item['topics']['years']:
                    i = year2index[y]
                    topic_set.add(item['topics']['max'][i][0])
        except Exception,e:
            pass
            #print "exp %s"%a
            #print e
    pattern = {"anchors":{}, "items":[], "links":[], "trajectories":[]}
    selected_topics = {0:[175],1:[103],2:[87],3:[127],4:[190],5:[109]}#cluster_topics_aff(list(topic_set))#
    topics = [175,103,87,125,190,107]
    word_dis_ = sorted(word_dis.items(), key=lambda x: sum([x[1][j] for j in topics]), reverse = True)

    topic_weight_dist = get_author_weight(author_set,topics,years)
    clusters,cluster_dict,cluster_center = cluster_author_by_topic_dist(topic_weight_dist,years)
    topic_cluster_dict = {}
    for i in range(len(selected_topics)):
        for j in selected_topics[i]:
            topic_cluster_dict[j] = i
    for a in range(len(selected_topics)):
        pattern['anchors'][a] = [{"year":year,"weight":len(selected_topics[a])*10, "topic":selected_topics[a]} for year in range(start_year,end_year)]#[topics_label[x][:3] for x in selected_topics[a]]} ]
    index = 0
    pattern["cluster"] = cluster_center
    for w in word_dis_[:500]:
        traj = []
        offset = -1
        for y in range(start_year,end_year):
            offset+=1
            pattern['items'].append({'name':w[0],
                                         'year':y,
                                         'max':max(range(len(w[1])),key=lambda x:w[1][x]),
                                         'cluster':int(cluster_dict[item["_id"]][y]),
                                         'weight':sum(w[1])})    
            for t in selected_topics:
                link = {'name':w[0],
                        'topic':selected_topics[t],
                        'source':t,
                        'target':index,
                        'offset':offset,
                        'year':y,
                        'weight':w[1][selected_topics[t][0]]}
                pattern['links'].append(link)
            traj.append(index)
            index+=1
        pattern['trajectories'].append(traj)    
    pattern['meta'] = {"num":len(range(start_year,end_year))}
    dump = open("topic.json","w")
    dump.write("var json = ")
    dump.write(json.dumps(pattern))
    dump.close()
    return HttpResponse(json.dumps(pattern))

def render_topic(request):
    mysql_client = mysql.Mysql()
    mongo_client = mongo.Mongo()
    smooth = "smooth"
    try:
        smooth = request.GET['smooth']
    except:
        pass
    start_year = int(request.GET['start'])
    end_year = int(request.GET['end'])
    author = request.GET['author']
    authors = get_topic_by_author(author)
    #papers,authors = mysql_client.get_paper_by_jconf(jconf)
    #author_topic = {}
    #for p in papers:
    topic_set = set()
    author_set = []
    years = range(start_year,end_year)
    at_col = pymongo.Connection("10.1.1.110",12345)['ringnet']['author_topic']
    for a in authors:
        try:
            cur = at_col.find({"_id":int(a)})
            item = cur.next()
            author_set.append(item)
            year2index = {}
            for i in range(len(item['topics']['years'])):
                year2index[item['topics']['years'][i]] = i
            for y in years:
                if y in item['topics']['years']:
                    i = year2index[y]
                    topic_set.add(item['topics']['max'][i][0])
        except Exception,e:
            pass
            #print "exp %s"%a
            #print e
    pattern = {"anchors":{}, "items":[], "links":[], "trajectories":[]}
    selected_topics = {0:[175],1:[103],2:[87],3:[127],4:[190],5:[109]}#cluster_topics_aff(list(topic_set))#
    topics = [175,103,87,125,190,107]
    #selected_topics = {}
    #i = 0
    #for t in topics:
    #    selected_topics[i] = [topic_map[t]]
    #    i+=1
    topic_weight_dist = get_author_weight(author_set,topics,years)
    clusters,cluster_dict,cluster_center = cluster_author_by_topic_dist(topic_weight_dist,years)
    topic_cluster_dict = {}
    for i in range(len(selected_topics)):
        for j in selected_topics[i]:
            topic_cluster_dict[j] = i
    for a in range(len(selected_topics)):
        pattern['anchors'][a] = [{"year":year,"weight":len(selected_topics[a])*10, "topic":selected_topics[a]} for year in range(start_year,end_year)]#[topics_label[x][:3] for x in selected_topics[a]]} ]
    index = 0
    pattern["cluster"] = cluster_center
    for item in author_set:
        if not topic_weight_dist.has_key(item["_id"]):
            continue
        traj = []
        year2index = {}
        max_topics = set()
        flag = 0
        for i in range(len(item['topics']['years'])):
            year2index[item['topics']['years'][i]] = i
        for y in range(start_year,end_year):
            if not y in item['topics']['years']:
                flag = 1
                break
            else:
                max_topics.add(item['topics']['max'][year2index[y]][0])
        if flag == 1:
            continue
        offset = -1
        link_dict = defaultdict(dict)
        for y in range(start_year,end_year):
            offset+=1
            ts = set()
            for t in range(len(selected_topics)):
                for tt in selected_topics[t]:
                    ts.add(tt)
            if y in year2index:
                i = year2index[y]
                max_t=topic_cluster_dict.keys()[0]
                for x in topic_cluster_dict:
                    if item['topics']['all'][i][x]> item['topics']['all'][i][max_t]:
                        max_t = x
                pattern['items'].append({'name':item['_id'],
                                         'year':y,
                                         'max':int(topic_cluster_dict[max_t]),
                                         'cluster':int(cluster_dict[item["_id"]][y]),
                                         'weight':len(item['papers'][i])})    
                weight_dict = {}
                m = -1
                mt = 0
                weight_dict[topic_cluster_dict[max_t]] = item['topics']['all'][i][max_t]
                for t in range(len(selected_topics)):
                    w=0.0
                    c = 0

                    for tt in set(selected_topics[t]):#&set(item['topics']['relevent'][i]):#&max_topics:#:#max_topics:
                        w+=item['topics']['all'][i][tt]
                        c+=1
                    weight_dict[t] = w#/c
                weight_dict[topic_cluster_dict[max_t]] = item['topics']['all'][i][max_t]
                for t in weight_dict:
                    link = {'name':item['_id'],
                            'topic':selected_topics[t],
                            'source':t,
                            'target':index,
                            'offset':offset,
                            'year':y,
                            'weight':weight_dict[t]}
                    pattern['links'].append(link)#sum([item['topics']['smooth'][i][xx] for xx in selected_topics[t]])/len(selected_topics[t])})
                    link_dict[y][t] = (link)
            traj.append(index)
            index+=1
        for y in range(start_year, end_year):
            for t in link_dict[y]:
                smooth_w = []
                smooth_w.append(link_dict[y][t]['weight'])
                smooth_w.append(link_dict[y][t]['weight'])
                if y > start_year:
                     smooth_w.append(link_dict[y-1][t]['weight'])
                if y < end_year-1:
                     smooth_w.append(link_dict[y+1][t]['weight'])
                link_dict[y][t]['weight'] = sum(smooth_w)/len(smooth_w)
        pattern['trajectories'].append(traj)    
    pattern['meta'] = {"num":len(range(start_year,end_year))}
    dump = open("topic.json","w")
    dump.write("var json = ")
    dump.write(json.dumps(pattern))
    dump.close()
    return HttpResponse(json.dumps(pattern))

def render_topic_2_19(request):
    mysql_client = mysql.Mysql()
    mongo_client = mongo.Mongo()
    smooth = "smooth"
    try:
        smooth = request.GET['smooth']
    except:
        pass
    start_year = int(request.GET['start'])
    end_year = int(request.GET['end'])
    jconf = request.GET['jconf']
    jconf_topic = mysql_client.get_conference_topic(jconf)
    topic_dict = defaultdict(int)
    for j in jconf_topic:
        x = j[2].split(';')
        try:
            for i in range(10):
                topic_dict[int(x[i])]+=1
        except Exception,e:
            pass
    topic_dict_sorted = sorted(topic_dict.keys(), key = lambda x:topic_dict[x], reverse = True)
    topics = topic_dict_sorted[:5]
    aus = request.GET['authors']
    authors = []
    if aus[0]!='"':
        lim = int(aus)
        #labels = ["Database System","Software Engineering","Real-Time Systems","Machine Learning","Data Mining",
        #          "User Interface Design","Automata Theory","Face Recognition","Information Retrival","Sensor Networks"]
        #topics = [127,129,73,197,89,59,67,62,50,36]
        #topics = [127,89,197,50,62]
        try:
            authors = get_top_authors(topics, lim)
        except Exception,e:
            print e
        topic_set = range(200)
    else:
        for y in aus.strip('"').split(','):
            authors.append(int(y.strip()))
    topic_set = set()
    author_set = []
    years = range(start_year,end_year)
    at_col = pymongo.Connection("10.1.1.110",12345)['ringnet']['author_topic']
    for a in authors:
        try:
            cur = at_col.find({"_id":int(a)})
            item = cur.next()
            author_set.append(item)
            year2index = {}
            for i in range(len(item['topics']['years'])):
                year2index[item['topics']['years'][i]] = i
            for y in years:
                if y in item['topics']['years']:
                    i = year2index[y]
                    topic_set.add(item['topics']['max'][i][0])
        except Exception,e:
            print e
    pattern = {"anchors":{}, "items":[], "links":[], "trajectories":[]}
    selected_topics = {}
    i = 0
    for t in topics:
        selected_topics[i] = [topic_map[t]]
        i+=1
    #selected_topics = {0:[175],1:[103],2:[87],3:[127],4:[190],5:[109]}#cluster_topics_aff(list(topic_set))#
    #topics = [175,103,87,125,190,107]
    topic_weight_dist = get_author_weight(author_set,topics,years)
    clusters,cluster_dict,cluster_center = cluster_author_by_topic_dist(topic_weight_dist,years)
    
    topic_cluster_dict = {}
    for i in range(len(selected_topics)):
        for j in selected_topics[i]:
            topic_cluster_dict[j] = i
    for a in range(len(selected_topics)):
        pattern['anchors'][a] = [{"year":year,"weight":len(selected_topics[a])*10, "topic":selected_topics[a]} for year in range(start_year,end_year)]#[topics_label[x][:3] for x in selected_topics[a]]} ]
    index = 0
    pattern["cluster"] = cluster_center
    for item in author_set:
        if not topic_weight_dist.has_key(item["_id"]):
            continue
        traj = []
        year2index = {}
        max_topics = set()
        flag = 0
        for i in range(len(item['topics']['years'])):
            year2index[item['topics']['years'][i]] = i
        for y in range(start_year,end_year):
            if not y in item['topics']['years']:
                flag = 1
                break
            else:
                max_topics.add(item['topics']['max'][year2index[y]][0])
        if flag == 1:
            continue
        offset = -1
        link_dict = defaultdict(dict)
        for y in range(start_year,end_year):
            offset+=1
            ts = set()
            for t in range(len(selected_topics)):
                for tt in selected_topics[t]:
                    ts.add(tt)
            if y in year2index:
                i = year2index[y]
                max_t=topic_cluster_dict.keys()[0]
                for x in topic_cluster_dict:
                    if item['topics']['all'][i][x]> item['topics']['all'][i][max_t]:
                        max_t = x
                pattern['items'].append({'name':item['_id'],
                                         'year':y,
                                         'max':int(topic_cluster_dict[max_t]),
                                         'cluster':int(cluster_dict[item["_id"]][y]),
                                         'weight':len(item['papers'][i])})    
                weight_dict = {}
                m = -1
                mt = 0
                weight_dict[topic_cluster_dict[max_t]] = item['topics']['all'][i][max_t]
                for t in range(len(selected_topics)):
                    w=0.0
                    c = 0

                    for tt in set(selected_topics[t]):#&set(item['topics']['relevent'][i]):#&max_topics:#:#max_topics:
                        w+=item['topics']['all'][i][tt]
                        c+=1
                    weight_dict[t] = w#/c
                weight_dict[topic_cluster_dict[max_t]] = item['topics']['all'][i][max_t]
                for t in weight_dict:
                    link = {'name':item['_id'],
                            'topic':selected_topics[t],
                            'source':t,
                            'target':index,
                            'offset':offset,
                            'year':y,
                            'weight':weight_dict[t]}
                    pattern['links'].append(link)#sum([item['topics']['smooth'][i][xx] for xx in selected_topics[t]])/len(selected_topics[t])})
                    link_dict[y][t] = (link)
            traj.append(index)
            index+=1
        for y in range(start_year, end_year):
            for t in link_dict[y]:
                smooth_w = []
                smooth_w.append(link_dict[y][t]['weight'])
                smooth_w.append(link_dict[y][t]['weight'])
                if y > start_year:
                     smooth_w.append(link_dict[y-1][t]['weight'])
                if y < end_year-1:
                     smooth_w.append(link_dict[y+1][t]['weight'])
                link_dict[y][t]['weight'] = sum(smooth_w)/len(smooth_w)
        pattern['trajectories'].append(traj)    
    pattern['meta'] = {"num":len(range(start_year,end_year))}
    dump = open("topic.json","w")
    dump.write("var json = ")
    dump.write(json.dumps(pattern))
    dump.close()
    return HttpResponse(json.dumps(pattern))

def render_topic_2_18(request):
    mysql_client = mysql.Mysql()
    mongo_client = mongo.Mongo()
    smooth = "smooth"
    try:
        smooth = request.GET['smooth']
    except:
        pass
    start_year = int(request.GET['start'])
    end_year = int(request.GET['end'])
    aus = request.GET['authors']
    if aus[0]!='"':
        lim = int(aus)
        labels = ["Database System","Software Engineering","Real-Time Systems","Machine Learning","Data Mining",
                  "User Interface Design","Automata Theory","Face Recognition","Information Retrival","Sensor Networks"]
        topics = [127,129,73,197,89,59,67,62,50,36]
        topics = [127,89,197,50,62]
        #topics = [127,197,89]
        #topics = [89]
        try:
            authors = get_top_authors(topics, lim)
        except Exception,e:
            print e
        topic_set = range(200)
    else:
        authors = []
        for y in aus.strip('"').split(','):
            authors.append(int(y.strip()))
    #get ego network of authors

    #authors = mysql_client.get_coauthors(authors)
    ##random sample a part of the authors to display
    #authors = random.sample(authors,500)
    ##get_topic_item_link(range(start_year,end_year))

    topic_set = set()
    author_set = []
    years = range(start_year,end_year)
    at_col = pymongo.Connection("10.1.1.110",12345)['ringnet']['author_topic']
    for a in authors:
        try:
            cur = at_col.find({"_id":int(a)})
            item = cur.next()
            author_set.append(item)
            year2index = {}
            for i in range(len(item['topics']['years'])):
                year2index[item['topics']['years'][i]] = i
            for y in years:
                if y in item['topics']['years']:
                    i = year2index[y]
                    #topic_set = set(topic_set)|(set(item['topics']['relevent'][i]))
                    topic_set.add(item['topics']['max'][i][0])
        except Exception,e:
            print e

    pattern = {"anchors":{}, "items":[], "links":[], "trajectories":[]}
    selected_topics = {0:[175],1:[103],2:[87],3:[127],4:[190],5:[109]}#cluster_topics_aff(list(topic_set))#
    topics = [175,103,87,125,190,107]
    topic_weight_dist = get_author_weight(author_set,topics,years)
    clusters,cluster_dict,cluster_center = cluster_author_by_topic_dist(topic_weight_dist,years)
    
    topic_cluster_dict = {}
    for i in range(len(selected_topics)):
        for j in selected_topics[i]:
            topic_cluster_dict[j] = i
    for a in range(len(selected_topics)):
        pattern['anchors'][a] = [{"year":year,"weight":len(selected_topics[a])*10, "topic":selected_topics[a]} for year in range(start_year,end_year)]#[topics_label[x][:3] for x in selected_topics[a]]} ]
    index = 0

    pattern["cluster"] = cluster_center
    for item in author_set:
        if not topic_weight_dist.has_key(item["_id"]):
            continue
                                      
        traj = []
        year2index = {}
        max_topics = set()
        flag = 0
        for i in range(len(item['topics']['years'])):
            year2index[item['topics']['years'][i]] = i
        for y in range(start_year,end_year):
            if not y in item['topics']['years']:
                flag = 1
                break
            else:
                max_topics.add(item['topics']['max'][year2index[y]][0])
        if flag == 1:
            continue
        offset = -1
        link_dict = defaultdict(dict)
        for y in range(start_year,end_year):
            offset+=1
            ts = set()
            for t in range(len(selected_topics)):
                for tt in selected_topics[t]:
                    ts.add(tt)
            if y in year2index:
                i = year2index[y]
                max_t=topic_cluster_dict.keys()[0]
                for x in topic_cluster_dict:
                    if item['topics']['all'][i][x]> item['topics']['all'][i][max_t]:
                        max_t = x
                pattern['items'].append({'name':item['_id'],
                                         'year':y,
                                         'max':int(topic_cluster_dict[max_t]),
                                         'cluster':int(cluster_dict[item["_id"]][y]),
                                         'weight':len(item['papers'][i])})    
                weight_dict = {}
                m = -1
                mt = 0
                weight_dict[topic_cluster_dict[max_t]] = item['topics']['all'][i][max_t]

                #else:
                for t in range(len(selected_topics)):
                    w=0.0
                    c = 0

                    for tt in set(selected_topics[t]):#&set(item['topics']['relevent'][i]):#&max_topics:#:#max_topics:
                    #if selected_topics[t][tt] in item['topics']['relevent'][i]:
                        #if w<item['topics']['smooth'][i][tt]:
                        w+=item['topics']['all'][i][tt]
                        c+=1
                    weight_dict[t] = w#/c
                weight_dict[topic_cluster_dict[max_t]] = item['topics']['all'][i][max_t]
                #s = sum(weight_dict.values())
                #for t in weight_dict:
                #    weight_dict[t]/s

                for t in weight_dict:
                    link = {'name':item['_id'],
                            'topic':selected_topics[t],
                            'source':t,
                            'target':index,
                            'offset':offset,
                            'year':y,
                            'weight':weight_dict[t]}
                    pattern['links'].append(link)#sum([item['topics']['smooth'][i][xx] for xx in selected_topics[t]])/len(selected_topics[t])})
                    link_dict[y][t] = (link)
            traj.append(index)
            index+=1
        for y in range(start_year, end_year):
            for t in link_dict[y]:
                smooth_w = []
                smooth_w.append(link_dict[y][t]['weight'])
                smooth_w.append(link_dict[y][t]['weight'])
                if y > start_year:
                     smooth_w.append(link_dict[y-1][t]['weight'])
                if y < end_year-1:
                     smooth_w.append(link_dict[y+1][t]['weight'])
                link_dict[y][t]['weight'] = sum(smooth_w)/len(smooth_w)


            #else:
            #    #when author don't have any publication, assume author's topic distribution stay the same, and generate a virtual node
            #    pattern['items'].append({'name':item['_id'],#names[authors.index(item['_id'])],
            #                             'year':y,
            #                             'max':-1,
            #                             'weight':-1})   
            #    if y > item['topics']['years'][0]:
            #        for j in range(len(item['topics']['years'])):
            #            if item['topics']['years'][j]>y:
            #                break
            #        j-=1
            #        for t in range(len(selected_topics)):
            #            w=0.0
            #            c=0
            #            for tt in set(selected_topics[t])&set(relevant):
            #                #if w<item['topics']['smooth'][i][tt]:
            #                w+=item['topics'][smooth][i][tt]
            #                c+=1
            #            #if selected_topics[t] in item['topics']['relevent'][i]:
            #            if w > 0:
            #                pattern['links'].append({'name':item['_id'],
            #                                            'topic':selected_topics[t],
            #                                            'source':t,
            #                                            'target':index,
            #                                            'offset':offset,
            #                                            'year':y,
            #                                            'weight':w/c})#sum([item['topics']['smooth'][j][xx] for xx in selected_topics[t]])/len(selected_topics[t])})
            #                break

        pattern['trajectories'].append(traj)    
    pattern['meta'] = {"num":len(range(start_year,end_year))}
    dump = open("topic.json","w")
    dump.write("var json = ")
    dump.write(json.dumps(pattern))
    dump.close()
    return HttpResponse(json.dumps(pattern))


def render_community(request):
    pass

def ringnet(request):
    mysql_client = mysql.Mysql()
    jconf = mysql_client.get_conference()
    return render_to_response("ringnet.html", {"jconf":jconf})

def render_egonet(request):
    start = int(request.GET['start'])
    end = int(request.GET['end'])
    aus = request.GET['authors']
    years = [start,end]
    authors = []
    for y in aus.strip('"').split(','):
        authors.append(int(y.strip()))
    #years = [2009,2010]#request.GET['range']
    #authors = [745329,265966,575748]#request.GET['authors']
    pattern = {"range":[], "topics":[], "communities":[], "focus": []}
    pattern['range'] = years
    topic_set = []
    author_set = []
    for a in authors:
        item = at_col.find({"_id":a}).next()
        author_set.append(item)
        year2index = {}
        for i in range(len(item['topics']['years'])):
            year2index[item['topics']['years'][i]] = i
        for y in years:
            if y in item['topics']['years']:
                i = year2index[y]
                topic_set = set(topic_set)|set(item['topics']['relevent'][i])
    for item in author_set:
        year2index = {}
        for i in range(len(item['topics']['years'])):
            year2index[item['topics']['years'][i]] = i
        focus = {"name":item["_id"], "topics":[], "communities":[], "trace":[]}
        for y in years:
            if y in item['topics']['years']:
                i = year2index[y]
                ts = []
                for t in item['topics']['relevent'][i]:
                    ts.append({'v':item['topics']['all'][i][t]})
                focus['topics'].append(ts)
                focus['communities'].append([{"v":0.5}, {"v":0.2}, {"v":0.1}, {"v":0.3}, {"v":0.7}])
                focus['trace'].append({"weight":len(item['papers'][i])})
            else:
                focus['topics'].append([])
                focus['communities'].append([{"v":0.5}, {"v":0.2}, {"v":0.1}, {"v":0.3}, {"v":0.7}])
                focus['trace'].append({"weight":0})
        pattern['focus'].append(focus)
    for t in topic_set:
        pattern['topics'].append([topics_label[t][j] for j in range(3)])
    pattern['communities'] = [{"labels":[random.sample(authors), random.sample(authors)]}, 
                            {"labels":[random.sample(authors), random.sample(authors)]},
                            {"labels":[random.sample(authors), random.sample(authors)]},
                            {"labels":[random.sample(authors), random.sample(authors)]},
                            {"labels":[random.sample(authors), random.sample(authors)]}]
    return HttpResponse(json.dumps(pattern))


def egonet(request):
    pass

def get_jconf_topic(request):
    jconf = request.GET["jconf"]
    mysql_client = mysql.Mysql()
    jconf_topic = mysql_client.get_conference_topic(jconf)
    topics = []
    for j in jconf_topic:
        x = j[2].split(';')
        topics.extend(x[:5])
    return HttpResponse(json.dumps(topics))



    