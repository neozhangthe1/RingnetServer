# Create your views here.
from django.http import HttpResponse
from django.shortcuts import render_to_response
import pymongo
import json
import random
import pickle
import math
import redis 
from RingNetServer import settings
from RingNetServer.database import mysql,redispy,whooshidx,mongo
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
topic_f = open(os.path.join(settings.RESOURCE_DIR,"tw.txt").replace('\\','/'))
topic_map_f = open(os.path.join(settings.RESOURCE_DIR,"match2.txt").replace('\\','/'))
topic_map = [int(line) for line in topic_map_f]

alphabet_f = open(os.path.join(settings.RESOURCE_DIR,"alphabet.txt").replace('\\','/'))
topic_dis_f = open(os.path.join(settings.RESOURCE_DIR,"topics.txt").replace('\\','/'))
alphabet = []
word_dis = defaultdict(lambda: [0.0 for i in range(200)])
topic_dis = defaultdict(lambda: {})
for line in alphabet_f:
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

for line in topic_f:
    x = line.split(' ')
    t = []
    for y in x:
        t.append(y)
    topics_label.append(t)
topic_adj = pickle.load(open(os.path.join(settings.RESOURCE_DIR,"topic_adj_w.pickle").replace('\\','/')))
author_topic = pickle.load(open(os.path.join(settings.RESOURCE_DIR,"selected_author_topics.pickle").replace('\\','/')))

f = open(os.path.join(settings.RESOURCE_DIR,"communities.txt").replace('\\','/'))
author_comm = {}
for line in f:
    if line[0] == "#":
        continue
    x=line.split('\t')
    author_comm[int(x[0])]=int(x[1])

pub_comm = pickle.load(open(os.path.join(settings.RESOURCE_DIR,"pub_comm.pickle").replace('\\','/')))
x = open(os.path.join(settings.RESOURCE_DIR,"topicNames.json").replace('\\','/'))
topic_names = []
for line in x:
    topic_names.append(line.strip('\n').strip(',').strip('"'))
comm_label = pickle.load(open(os.path.join(settings.RESOURCE_DIR,"comm_label.pickle").replace('\\','/')))

def get_top_authors(topics, lim):
    redis_client = redis.StrictRedis(host="arnetminer.org",db=0)
    authors = set()
    for t in topics:
        authors = authors.union(set(redis_client.zrevrange("AuthorFeature:hindex:t"+str(t),0,lim)))
    return authors

#def get_author_feature():
#    redis_client = redis.StrictRedis(host="arnetminer.org", db=0)
#    redis_client

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

# get auther topic distribution of each years
def get_author_weight(authors,topics,years):
    author_topic_dist = defaultdict(lambda: defaultdict(lambda: [0.0 for i in range(len(topics))]))
    topic_year_max = defaultdict(lambda: defaultdict(lambda: 0))
    for a in authors:
        flag = 0
        year2index = {}
        for i in range(len(a['topics']['years'])):
            year2index[a['topics']['years'][i]] = i
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
        for y in years:
            for i in range(len(topics)):
                author_topic_dist[a['_id']][y][i] = a['topics']['all'][year2index[y]][topics[i]]
                if topic_year_max[a['_id']][y]<author_topic_dist[a['_id']][y][i]:
                    topic_year_max[a['_id']][y] = author_topic_dist[a['_id']][y][i]
    for y in years:
        for a in author_topic_dist:
            for i in range(len(topics)):
                author_topic_dist[a][y][i]/=topic_year_max[a][y]
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

# query the mongo db to get authors' topics and papers
def get_author_info(authors):
    author_set = []
    topic_set = []
    topic_sum = defaultdict(lambda:0)
    for a in authors:
        try:
            cur = at_col.find({"_id":int(a)})
            item = cur.next()
            author_set.append(item)
            year2index = {}
            for i in range(len(item['topics']['years'])):
                year2index[item['topics']['years'][i]] = i
            for y in year2index:
                i = year2index[y]
                for t in range(200):
                    topic_sum[t]+=item['topics']['all'][i][t]
        except Exception,e:
            pass
    selected_topics = {}
    topics = [t[0] for t in sorted(topic_sum.items(), key=lambda x:x[1], reverse=True)[:10]]
    for i in range(len(topics)):
        selected_topics[i]=topics[i]
    return author_set, topic_set, selected_topics

# get author's papers in each year
def get_author_papers(authors, years):
    author_papers = {}
    year_max = defaultdict(lambda: 0)
    for a in authors:
        papers = {}
        year2index = {}
        for i in range(len(a['papers'])):
            year2index[a['papers'][i]['year']] = i
        for y in years:
            if y in year2index:
                i = year2index[y]
                papers[y] = a['papers'][i]['papers']
                if len(papers[y])>year_max[y]:
                    year_max[y] = len(papers[y])
            else:
                papers[y] = []
        author_papers[a['_id']] = papers
    return author_papers, year_max

# render topic to json
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
    author = request.GET['jconf']
    authors = get_topic_by_author(author)
    topic_set = set()
    author_set = []
    years = range(start_year,end_year)
    at_col = pymongo.Connection("10.1.1.110",12345)['ringnet']['author_topic']
    topic_sum = defaultdict(int)
    print "get authors info..."
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
                    for t in range(200):
                        topic_sum[t]+=item['topics']['all'][i][t]
        except Exception,e:
            pass
    selected_topics = {}
    topics = [t[0] for t in sorted(topic_sum.items(), key=lambda x:x[1], reverse=True)[:6]]
    for i in range(len(topics)):
        selected_topics[i]=[topics[i]]
    pattern = {"anchors":{}, "items":[], "links":[], "trajectories":[]}
    print "get authors weight..."
    topic_weight_dist = get_author_weight(author_set,topics,years)
    print "cluster authors..."
    clusters,cluster_dict,cluster_center = cluster_author_by_topic_dist(topic_weight_dist,years)
    topic_cluster_dict = {}
    for i in range(len(selected_topics)):
        for j in selected_topics[i]:
            topic_cluster_dict[j] = i
    for a in range(len(selected_topics)):
        pattern['anchors'][a] = [{"year":year,"weight":len(selected_topics[a])*10, "topic":selected_topics[a]} for year in range(start_year,end_year)]#[topics_label[x][:3] for x in selected_topics[a]]} ]
    index = 0
    print "render to json..."
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
    print "done"
    return HttpResponse(json.dumps(pattern))

def ringnet(request):
    mysql_client = mysql.Mysql()
    au = get_top_authors(range(200),5)
    jconf = mysql_client.get_authors_name(list(au))#mysql_client.get_conference()
    return render_to_response("ringnet.html", {"jconf":jconf})

def coevolution(request):
    return render_to_response("coevolution.html")

def cosine_distance(u, v):
    """
    Returns the cosine of the angle between vectors v and u. This is equal to
    u.v / |u||v|.
    """
    mu = max(u)
    mv = max(v)
    u = np.array(u)/float(mu)
    v = np.array(v)/float(mv)
    result = np.dot(u, v) / (math.sqrt(np.dot(u, u)) * math.sqrt(np.dot(v, v))) 
    if result>0:
        return result
    else:
        return 0

def search(request):
    q = request.GET["q"]
    whoosh_client = whooshidx.Whoosh()
    if request.GET.has_key("content"):
        get = request.GET
        whoosh_client.append(get["title"],get["content"],get["path"])
        q = get["title"]
    ret = []
    for x in whoosh_client.search(q):
        y = {}
        for k in x:
            y[k] = x[k]
        ret.append(y)
    return HttpResponse(json.dumps(ret))


selected_topics = []
topic_index = {}
def add_coevo(request):
    mysql_client = mysql.Mysql()
    whoosh_client = whooshidx.Whoosh()
    start = int(request.GET['start'])
    end = int(request.GET['end'])
    name = request.GET['name']
    years = range(start,end)
    authors = []
    result = whoosh_client.search(name)
    authors.append(int(result[0]["path"]))
    author_set, topic_set, selected_topics = get_author_info(authors)
    max_wei = 0
    names = mysql_client.get_authors_name_dict(authors)
    author_topic_dist = get_author_weight(author_set,selected_topics,years)
    author_papers, year_max = get_author_papers(author_set, years)
    for a in author_set:
        print a["_id"]
        focus = {"name":names[a["_id"]].replace(".","").split(',')[0].replace(" ","_"),"categories":[],"trace":[]}
        categories_topic = []
        trace = []
        for y in range(start, end):
            cat = []
            for t in topic_index:
                cat.append({"size":author_topic_dist[a["_id"]][y][topic_index[t]],
                            "rank":author_topic_dist[a["_id"]][y][topic_index[t]]})
            categories_topic.append(cat)
        for y in range(start,end):
            trace.append({"weight":len(author_papers[a["_id"]][y])/float(year_max[y])})
        focus["categories"].append(categories_topic)
        focus["categories"].append(categories_topic)
        focus["trace"] = trace
    return HttpResponse(json.dumps(focus))

def render_coevo(request):
    mysql_client = mysql.Mysql()
    whoosh_client = whooshidx.Whoosh()
    start = int(request.GET['start'])
    end = int(request.GET['end'])
    aus = request.GET['authors']
    years = range(start,end)
    authors_name = []
    for y in aus.strip('"').strip("'").split(','):
        authors_name.append(y.strip("'").strip('"'))
    authors = []
    for a in authors_name:
        #result = whoosh_client.search(a)
        #authors.append(int(result[0]["path"]))
        authors.append(int(a))
    
    pattern = {"range":[start, end-1], "categories":[], "time":(start+end)/2, "focus": []}
    author_set, topic_set, selected_topics = get_author_info(authors)
    categories_topic = {"name":"topic", "items":[], "relations":[]}
    topic_index = {} 
    for t in selected_topics:
        categories_topic["items"].append({"labels":topics_label[t][:10],"ids":selected_topics[t]})
        topic_index[selected_topics[t]]=t
    max_wei = 0
    for i in range(len(selected_topics)):
        for j in range(i+1, len(selected_topics)):
            t1 = selected_topics[i]
            t2 = selected_topics[j]
            print t1
            print t2
            wei = cosine_distance(topic_dis[t1].values(), topic_dis[t2].values())
            if max_wei<wei:
                max_wei=wei
            categories_topic["relations"].append({"source":topic_index[t1],
                                                  "target":topic_index[t2],
                                                  "wei":[wei for x in range(start,end)]})
    for r in categories_topic["relations"]:
        for w in range(len(r["wei"])):
            r["wei"][w] /= max_wei
    pattern["categories"].append(categories_topic)  

    names = mysql_client.get_authors_name_dict(authors)
    author_topic_dist = get_author_weight(author_set,selected_topics,years)
    author_papers, year_max = get_author_papers(author_set, years)
    print len(author_set)
    author_year_comm_dist = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
    author_year_comm = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    comm_author_year_dist = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    comm_paper_year = defaultdict(lambda: defaultdict(list))
    comm_author = defaultdict(int)
    comm_members = set()
    year_comm = defaultdict(lambda: defaultdict(list))
    for au in author_set:
        a = au["_id"]
        for y in range(start, end):
            papers = author_papers[a][y]
            if len(papers)<1:
                continue
            coauthors = mysql_client.get_publication_authors(papers)
            for p in coauthors:
                for c in coauthors[p]:
                    if author_comm.has_key(c):
                        
                        author_year_comm[a][y][author_comm[c]]+=1
                        comm_author[author_comm[c]]+=1
                        comm_paper_year[author_comm[c]][y].append(p)
                        comm_author_year_dist[author_comm[c]][y][a]+=1
            try:
                m = max(author_year_comm[a][y].items(), key=lambda x:x[1])[1]
            except:
                m = 1
            for x in author_year_comm[a][y]:
                author_year_comm_dist[a][y][x] = float(author_year_comm[a][y][x])/m
    sort_comm = sorted(comm_author.items(), key=lambda x: x[1], reverse=True)
    selected_comm = []
    selected_comm_dict = {}
    categories_community = {"name":"community", "items":[], "relations":[]}
    ind = 0
    for c in sort_comm[:10]:
        t = c[0]
        categories_community["items"].append({"labels":comm_label[t],"ids":t})
        selected_comm.append(t)
        selected_comm_dict[t] = ind
        ind+=1

    max_wei = defaultdict(int)
    for i in range(len(selected_comm)):
        for j in range(i+1, len(selected_comm)):
            t1 = selected_comm[i]
            t2 = selected_comm[j]
            print t1
            print t2
            wei = []
            index = 0
            for y in range(start, end):
                d1=[]
                d2=[]
                for au in author_set:
                    a = au["_id"]
                    d1.append(comm_author_year_dist[t1][y][a])
                    d2.append(comm_author_year_dist[t2][y][a])
                x = cosine_distance(d1, d2)
                wei.append(x)
                if max_wei[index]<x:
                    max_wei[index]=x
                index+=1
            categories_community["relations"].append({"source":selected_comm_dict[t1],
                                                      "target":selected_comm_dict[t2],
                                                      "wei":wei})
    for r in categories_community["relations"]:
        for w in range(len(r["wei"])):
            if max_wei[w] == 0:
                continue
            r["wei"][w] /= max_wei[w]
    max_wei = 0
    categories_community["relations"] = []
    for i in range(len(selected_comm)):
        for j in range(i+1, len(selected_comm)):
            t1 = selected_comm[i]
            t2 = selected_comm[j]
            print t1
            print t2
            wei = len(set(pub_comm[t1])&set(pub_comm[t2]))
            if max_wei<wei:
                max_wei=wei
            categories_community["relations"].append({"source":selected_comm_dict[t1],
                                                  "target":selected_comm_dict[t2],
                                                  "wei":[wei for x in range(start,end)]})
    for r in categories_community["relations"]:
        for w in range(len(r["wei"])):
            if max_wei == 0:
                r["wei"][w] = 0
            else:
                r["wei"][w] /= float(max_wei)
    dup = 0
    for i in range(len(selected_comm), 10):
        dup+=1
        sel_com = comm_label.keys()[i]
        categories_community["items"].append({"labels":comm_label[sel_com],"ids":sel_com})
        for j in range(i):
            categories_community["relations"].append({"source":j,
                                                      "target":i,
                                                      "wei":0.0})
    pattern["categories"].append(categories_community)    
    for a in author_set:
        print a["_id"]
        focus = {"name":names[a["_id"]].replace(".","").split(',')[0].replace(" ","_"),"categories":[],"trace":[]}
        categories_topic = []
        categories_community = []
        trace = []
        for y in range(start, end):
            cat = []
            for t in topic_index:
                cat.append({"size":author_topic_dist[a["_id"]][y][topic_index[t]],
                            "rank":author_topic_dist[a["_id"]][y][topic_index[t]]})
            categories_topic.append(cat)
            cat = []
            for c in selected_comm:
                cat.append({"size":author_year_comm_dist[a["_id"]][y][c],
                            "rank":author_year_comm_dist[a["_id"]][y][c]})
            for c in range(dup):
                cat.append({"size":0,
                            "rank":0})
            categories_community.append(cat)
        for y in range(start,end):
            if year_max[y]>0:
                trace.append({"weight":len(author_papers[a["_id"]][y])/float(year_max[y])})
            else:
                trace.append({"weight":0})
        focus["categories"].append(categories_topic)
        focus["categories"].append(categories_community)
        focus["trace"] = trace
        pattern["focus"].append(focus)
    return HttpResponse(json.dumps(pattern))
        
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


def autocomplete(request):
    sqs = SearchQuerySet().autocomplete(request.GET.get('q', ''))[:5]
    suggestions = [result.title for result in sqs]
    # Make sure you return a JSON object, not a bare list.
    # Otherwise, you could be vulnerable to an XSS attack.
    the_data = json.dumps({
        'results': suggestions
    })
    return HttpResponse(the_data, content_type='application/json')