def render_topic3(request):
    smooth = "smooth"
    try:
        smooth = request.GET['smooth']
    except:
        pass
    start_year = int(request.GET['start'])
    end_year = int(request.GET['end'])
    #aus = request.GET['authors']
    #if aus[0]!='"':
    #    lim = int(aus)
    #    labels = ["Database System","Software Engineering","Real-Time Systems","Machine Learning","Data Mining",
    #              "User Interface Design","Automata Theory","Face Recognition","Information Retrival","Sensor Networks"]
    #    topics = [127,129,73,197,89,59,67,62,50,36]
    #    try:
    #        authors = get_top_authors(topics, lim)
    #    except Exception,e:
    #        print e
    #    topic_set = range(200)
    #else:
    #    authors = []
    #    for y in aus.strip('"').split(','):
    #        authors.append(int(y.strip()))
    authors = mysql.client.get_coauthors(1458619)
    author_set, topic_set = get_author_data(authors,range(start_year,end_year))
    pattern = {"anchors":{}, "items":[], "links":[], "trajectories":[]}
    selected_topics = [87, 103, 92, 177, 157, 175, 113, 102, 135, 27]#cluster_topic_by_author(author_set,topic_set)
    topic_cluster_dict = {}
    for i in range(len(selected_topics)):
        for j in selected_topics[i]:
            topic_cluster_dict[j] = i
    for a in range(len(selected_topics)):
        pattern['anchors'][a] = [{"year":year,"weight":len(selected_topics[a])*10, "topic":selected_topics[a]} for year in range(start_year,end_year)]#[topics_label[x][:3] for x in selected_topics[a]]} ]
    index = 0
    for item in author_set:
        traj = []
        year2index = {}
        for i in range(len(item['topics']['years'])):
            year2index[item['topics']['years'][i]] = i
        relevant = []
        for j in item['topics']['overall']:
            relevant.append(j['id'])
        offset = -1
        for y in range(start_year,end_year):
            offset+=1
            if y in year2index:
                i = year2index[y]
                max=topic_cluster_dict.keys()[0]
                for x in topic_cluster_dict:
                    if author_topic[item['_id']][i][x]> author_topic[item['_id']][i][max]:
                        max = x
                pattern['items'].append({'name':item['_id'],
                                         'year':y,
                                         'max':int(topic_cluster_dict[max]),
                                         'weight':len(item['papers'][i])})      
                for t in range(len(selected_topics)):
                    w=0.0
                    c = 0
                    for tt in set(selected_topics[t]):#&set(relevant):
                    #if selected_topics[t][tt] in item['topics']['relevent'][i]:
                        #if w<item['topics']['smooth'][i][tt]:
                        w+=item['topics']['all'][i][tt]
                        c+=1
                    if w > 0:
                        pattern['links'].append({'name':item['_id'],
                                                    'topic':selected_topics[t],
                                                    'source':t,
                                                    'target':index,
                                                    'offset':offset,
                                                    'year':y,
                                                    'weight':(w/(item['topics']['all'][i][max]+author_topic[item['_id']][i][max]))})#sum([item['topics']['smooth'][i][xx] for xx in selected_topics[t]])/len(selected_topics[t])})
            else:
                #when author don't have any publication, assume author's topic distribution stay the same, and generate a virtual node
                pattern['items'].append({'name':item['_id'],#names[authors.index(item['_id'])],
                                         'year':y,
                                         'max':-1,
                                         'weight':-1})   
                if y > item['topics']['years'][0]:
                    for j in range(len(item['topics']['years'])):
                        if item['topics']['years'][j]>y:
                            break
                    j-=1
                    for t in range(len(selected_topics)):
                        w=0.0
                        c=0
                        for tt in set(selected_topics[t])&set(relevant):
                            #if w<item['topics']['smooth'][i][tt]:
                            w+=item['topics'][smooth][i][tt]
                            c+=1
                        #if selected_topics[t] in item['topics']['relevent'][i]:
                        if w > 0:
                            pattern['links'].append({'name':item['_id'],
                                                        'topic':selected_topics[t],
                                                        'source':t,
                                                        'target':index,
                                                        'offset':offset,
                                                        'year':y,
                                                        'weight':w/c})#sum([item['topics']['smooth'][j][xx] for xx in selected_topics[t]])/len(selected_topics[t])})
                            break
            traj.append(index)
            index+=1
        pattern['trajectories'].append(traj)    
    pattern['meta'] = {"num":len(range(start_year,end_year))}
    return HttpResponse(json.dumps(pattern))


def render_topic(request):
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
        try:
            authors = get_top_authors(topics, lim)
        except Exception,e:
            print e
        topic_set = range(200)
    else:
        authors = []
        for y in aus.strip('"').split(','):
            authors.append(int(y.strip()))
    mysql_client = mysql.Mysql()
    authors = mysql_client.get_coauthors(authors)
    import random
    authors = random.sample(authors,100)

    author_set, topic_set = get_author_data(authors,range(start_year,end_year))
    pattern = {"anchors":{}, "items":[], "links":[], "trajectories":[]}
    selected_topics = {0:[87], 1:[103], 2:[92], 3:[177], 4:[157], 5:[175], 6:[113], 7:[102], 8:[135], 9:[27]}#{0:[87,107,126,9,59],1:[103],2:[8],3:[4],4:[148,21,103],5:[0],6:[107],7:[5,16,192]}#cluster_topic_by_author(author_set,topic_set)
    topic_cluster_dict = {}
    for i in range(len(selected_topics)):
        for j in selected_topics[i]:
            topic_cluster_dict[j] = i
    for a in range(len(selected_topics)):
        pattern['anchors'][a] = [{"year":year,"weight":len(selected_topics[a])*10, "topic":selected_topics[a]} for year in range(start_year,end_year)]#[topics_label[x][:3] for x in selected_topics[a]]} ]
    index = 0
    for item in author_set:
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
        relevant = []
        for j in item['topics']['overall']:
            relevant.append(j['id'])
        offset = -1
        for y in range(start_year,end_year):
            offset+=1
            if y in year2index:
                i = year2index[y]
                max=topic_cluster_dict.keys()[0]
                for x in topic_cluster_dict:
                    if author_topic[item['_id']][i][x]> author_topic[item['_id']][i][max]:
                        max = x
                pattern['items'].append({'name':item['_id'],
                                         'year':y,
                                         'max':int(topic_cluster_dict[max]),
                                         'weight':len(item['papers'][i])})      
                for t in range(len(selected_topics)):
                    w=0.0
                    c = 0
                    for tt in set(selected_topics[t]):#&set(relevant):
                    #if selected_topics[t][tt] in item['topics']['relevent'][i]:
                        #if w<item['topics']['smooth'][i][tt]:
                        w+=author_topic[item['_id']][i][tt]
                        w+=item['topics']['all'][i][tt]
                        c+=1
                    if w > 0:
                        pattern['links'].append({'name':item['_id'],
                                                    'topic':selected_topics[t],
                                                    'source':t,
                                                    'target':index,
                                                    'offset':offset,
                                                    'year':y,
                                                    'weight':(w/(item['topics']['all'][i][max]))})#sum([item['topics']['smooth'][i][xx] for xx in selected_topics[t]])/len(selected_topics[t])})
            else:
                #when author don't have any publication, assume author's topic distribution stay the same, and generate a virtual node
                pattern['items'].append({'name':item['_id'],#names[authors.index(item['_id'])],
                                         'year':y,
                                         'max':-1,
                                         'weight':-1})   
                if y > item['topics']['years'][0]:
                    for j in range(len(item['topics']['years'])):
                        if item['topics']['years'][j]>y:
                            break
                    j-=1
                    for t in range(len(selected_topics)):
                        w=0.0
                        c=0
                        for tt in set(selected_topics[t])&set(relevant):
                            #if w<item['topics']['smooth'][i][tt]:
                            w+=item['topics'][smooth][i][tt]
                            c+=1
                        #if selected_topics[t] in item['topics']['relevent'][i]:
                        if w > 0:
                            pattern['links'].append({'name':item['_id'],
                                                        'topic':selected_topics[t],
                                                        'source':t,
                                                        'target':index,
                                                        'offset':offset,
                                                        'year':y,
                                                        'weight':w/c})#sum([item['topics']['smooth'][j][xx] for xx in selected_topics[t]])/len(selected_topics[t])})
                            break
            traj.append(index)
            index+=1
        pattern['trajectories'].append(traj)    
    pattern['meta'] = {"num":len(range(start_year,end_year))}
    return HttpResponse(json.dumps(pattern))

def render_topic_old(request):
    smooth = "smooth"
    try:
        smooth = request.GET['smooth']
    except:
        pass
    start_year = int(request.GET['start'])
    end_year = int(request.GET['end'])
    #aus = request.GET['authors']
    #if aus[0]!='"':
    #    lim = int(aus)
    #    labels = ["Database System","Software Engineering","Real-Time Systems","Machine Learning","Data Mining",
    #              "User Interface Design","Automata Theory","Face Recognition","Information Retrival","Sensor Networks"]
    #    topics = [127,129,73,197,89,59,67,62,50,36]
    #    try:
    #        authors = get_top_authors(topics, lim)
    #    except Exception,e:
    #        print e
    #    topic_set = range(200)
    #else:
    #    authors = []
    #    for y in aus.strip('"').split(','):
    #        authors.append(int(y.strip()))
    mysql_client = mysql.Mysql()
    authors = mysql_client.get_coauthors([1458619,745329])
    author_set, topic_set = get_author_data(authors,range(start_year,end_year))
    pattern = {"anchors":{}, "items":[], "links":[], "trajectories":[]}
    selected_topics = cluster_topics_aff(topic_set)#{0:[103],1:[87],2:[107],3:[125],4:[92],5:[175],6:[8],7:[58]}#
    topic_cluster_dict = {}
    for i in selected_topics:
        for j in selected_topics[i]:
            topic_cluster_dict[j] = i
    for a in range(len(selected_topics)):
        pattern['anchors'][a] = [{"year":year,"weight":len(selected_topics[a])*10, "topic":selected_topics[a]} for year in range(start_year,end_year)]#[topics_label[x][:3] for x in selected_topics[a]]} ]
    index = 0
    for item in author_set:
        flag = 0
        year2index = {}
        for i in range(len(item['topics']['years'])):
            year2index[item['topics']['years'][i]] = i
        max_topics = set()
        for y in range(start_year,end_year):
            if not y in item['topics']['years']:
                flag = 1
                break
            else:
                max_topics.add(item['topics']['max'][year2index[y]][0])
        if flag == 1:
            continue

        traj = []

        relevant = []
        for j in item['topics']['overall']:
            relevant.append(j['id'])
        offset = -1
        for y in range(start_year,end_year):
            offset+=1
            if y in year2index:
                i = year2index[y]
    
                weight_dict = {}
                for t in range(len(selected_topics)):
                    w=0.0
                    c = 0
                    for tt in set(selected_topics[t]):#&max_topics:
                    #if selected_topics[t][tt] in item['topics']['relevent'][i]:
                        #if w<item['topics']['smooth'][i][tt]:
                        w+=item['topics'][smooth][i][tt]
                        c+=1
                    weight_dict[t] = w/c
                max_weight = max(weight_dict.items(),key=lambda x:x[1])
                pattern['items'].append({'name':item['_id'],
                                'year':y,
                                'max':int(max_weight[0]),
                                'weight':len(item['papers'][i])})  
                #pattern['links'].append({'name':item['_id'],
                #                            'topic':selected_topics[max_weight[0]],
                #                            'source':max_weight[0],
                #                            'target':index,
                #                            'offset':offset,
                #                            'year':y,
                #                            'weight':max_weight[1]})#sum([item['topics']['smooth'][i][xx] for xx in selected_topics[t]])/len(selected_topics[t])})
                #for t in weight_dict:
                #    if weight_dict[t] > 0:
                #        pattern['links'].append({'name':item['_id'],
                #                                    'topic':selected_topics[t],
                #                                    'source':t,
                #                                    'target':index,
                #                                    'offset':offset,
                #                                    'year':y,
                #                                    'weight':(weight_dict[t]/max_weight[1])})#sum([item['topics']['smooth'][i][xx] for xx in selected_topics[t]])/len(selected_topics[t])})
            else:
                #when author don't have any publication, assume author's topic distribution stay the same, and generate a virtual node
                pattern['items'].append({'name':item['_id'],#names[authors.index(item['_id'])],
                                         'year':y,
                                         'max':-1,
                                         'weight':-1})   
                if y > item['topics']['years'][0]:
                    for j in range(len(item['topics']['years'])):
                        if item['topics']['years'][j]>y:
                            break
                    j-=1
                    for t in range(len(selected_topics)):
                        w=0.0
                        c=0
                        for tt in set(selected_topics[t])&set(relevant):
                            #if w<item['topics']['smooth'][i][tt]:
                            w+=item['topics'][smooth][i][tt]
                            c+=1
                        #if selected_topics[t] in item['topics']['relevent'][i]:
                        if w > 0:
                            pattern['links'].append({'name':item['_id'],
                                                        'topic':selected_topics[t],
                                                        'source':t,
                                                        'target':index,
                                                        'offset':offset,
                                                        'year':y,
                                                        'weight':w/c})#sum([item['topics']['smooth'][j][xx] for xx in selected_topics[t]])/len(selected_topics[t])})
                            break
            traj.append(index)
            index+=1
        pattern['trajectories'].append(traj)    
    pattern['meta'] = {"num":len(range(start_year,end_year))}
    return HttpResponse(json.dumps(pattern))

def render_topic_old(request, smooth = True):
    if smooth:
        smooth = "smooth"
    else:
        smooth = "all"
    start_year = int(request.GET['start'])
    end_year = int(request.GET['end'])
    authors = []
    aus = request.GET['authors']
    if aus[0]!='"':
        lim = int(aus)
        labels = ["Database System","Software Engineering","Real-Time Systems","Machine Learning","Data Mining",
                  "User Interface Design","Automata Theory","Face Recognition","Information Retrival","Sensor Networks"]
        topics = [127,129,73,197,89,59,67,62,50,36]
        try:
            authors = get_top_authors(topics, lim)
        except Exception,e:
            print e
        topic_set = range(200)
    else:
        authors = []
        for y in aus.strip('"').split(','):
            authors.append(int(y.strip()))


    pattern = {"anchors":{}, "items":[], "links":[], "trajectories":[]}
    selected_topics = [87, 103, 92, 177, 157, 175, 113, 102, 135, 27]
    for a in range(len(selected_topics)):
        pattern['anchors'][a] = [{"year":year,"weight":30, "topic":selected_topics[a]} for year in range(start_year,end_year)]
    index = 0
    for id in authors:
        res = at_col.find({"_id":id})
        if res.count() >0:
            item = res.next()
        else:
            continue
        #if not item['_id'] in authors:
        #    continue
        traj = []
        year2index = {}
        for i in range(len(item['topics']['years'])):
            year2index[item['topics']['years'][i]] = i
        offset = -1
        for y in range(start_year,end_year):
            offset+=1
            if y in year2index:
                i = year2index[y]
                pattern['items'].append({'name':names[authors.index(item['_id'])],
                                         'year':y,
                                         'max':item['topics']['max'][i],
                                         'weight':item['topics']['total_avg']})      
                for t in range(len(selected_topics)):
                    #if selected_topics[t] in item['topics']['relevent'][i]:
                    pattern['links'].append({'name':names[authors.index(item['_id'])],
                                                'topic':selected_topics[t],
                                                'source':t,
                                                'target':index,
                                                'offset':offset,
                                                'year':y,
                                                'weight':item['topics']['smooth'][i][selected_topics[t]]})
            else:
                #when author don't have any publication, assume author's topic distribution stay the same, and generate a virtual node
                pattern['items'].append({'name':names[authors.index(item['_id'])],
                                         'year':y,
                                         'max':-1,
                                         'weight':-1})   
                if y > item['topics']['years'][0]:
                    for j in range(len(item['topics']['years'])):
                        if item['topics']['years'][j]>y:
                            break
                    j-=1
                    for t in range(len(selected_topics)):
                        #if selected_topics[t] in item['topics']['relevent'][i]:
                        pattern['links'].append({'name':names[authors.index(item['_id'])],
                                                    'topic':selected_topics[t],
                                                    'source':t,
                                                    'target':index,
                                                    'offset':offset,
                                                    'year':y,
                                                    'weight':item['topics']['smooth'][j][selected_topics[t]]})
                #else:
                #    for j in range(len(item['topics']['years'])):
                #        for t in range(len(selected_topics)):
                #            #if selected_topics[t] in item['topics']['relevent'][i]:
                #            pattern['links'].append({'name':names[authors.index(item['_id'])],
                #                                        'topic':selected_topics[t],
                #                                        'source':t,
                #                                        'target':index,
                #                                        'offset':offset,
                #                                        'year':y,
                #                                        'weight':item['topics']['smooth'][j][selected_topics[t]]})
                        break
            traj.append(index)
            index+=1
        pattern['trajectories'].append(traj)    
    pattern['meta'] = {"num":10}
    return HttpResponse(json.dumps(pattern))