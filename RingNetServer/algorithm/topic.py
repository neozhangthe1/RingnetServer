"""
load data
"""
#class Topic(object):
#    def __init__(self):
#        self.


def get_egonetwork(author):
    author_topic

def topic_weight_smooth(topic_weight):
    for y in range(len(topic_weight)):
        for ts in topic_weight[y]:
            if sum(ts)==0:
                pass

def get_topic_weight(item, years, selected_topics):
    weights = []
    year2index = {}
    for i in range(len(item['topics']['years'])):
        year2index[item['topics']['years'][i]] = i
    offset = -1
    for y in years:
        weight = []
        if y in year2index:
            i = year2index[y]
            pattern['items'].append({'name':item['_id'],
                                        'year':y,
                                        'max':item['topics']['max'][i],
                                        'weight':len(item['papers'][i])})      
            for t in range(len(selected_topics)):
                w=0.0
                c = 0
                for tt in set(selected_topics[t]):#&set(item['topics']['relevent'][i]):
                #if selected_topics[t][tt] in item['topics']['relevent'][i]:
                    #if w<item['topics']['smooth'][i][tt]:
                    w+=item['topics']['smooth'][i][tt]
                    c+=1
                weight.append(w)
        else:
            weight = [0.0 for i in range(len(selected_topics))]
        weights.append(weight)

def cluster_topics(topics):
    if len(topics)<=10:
        return [[x] for x in topics]
    adj = np.array([[0.0 for i in range(len(topics))] for j in range(len(topics))])
    for i in range(len(topics)):
        for j in range(i+1,len(topics)):
            adj[i][j] = topic_adj[topics[i]][topics[j]]
            adj[j][i] = topic_adj[topics[j]][topics[i]]
            if adj[i][j]!=adj[j][i]:
                print "%s %s" %(adj[i][j],adj[j][i])
    sp = cluster.spectral_clustering(adj, n_clusters = 5)
    labels = {}
    for i in range(len(sp)):
        if not sp[i] in labels:
            labels[sp[i]] = []
        labels[sp[i]].append(topics[i])
    return labels

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
    for i in range(2):
        labels[i] = sorted_labels[i][1]
    return labels

def cluster_topic_by_author_aff(authors,topics):
    topic_index = {}
    for i in range(len(topics)):
        topic_index[topics[i]] = i
    adj = np.array([[0.0 for i in range(len(topics))] for j in range(len(topics))])
    for a in authors:
        for t in a['topics']['relevent']:
            for i in range(len(t)):
                for j in range(i+1, len(t)):
                    if topic_index.has_key(t[i]) and topic_index.has_key(t[j]):
                        adj[topic_index[t[i]]][topic_index[t[j]]]+=1
                        adj[topic_index[t[j]]][topic_index[t[i]]]+=1
    sp = cluster.AffinityPropagation().fit(adj).labels_
    labels = {}
    for i in range(len(sp)):
        if not sp[i] in labels:
            labels[sp[i]] = []
        labels[sp[i]].append(topics[i])
    return labels

def cluster_topic_by_author(authors,topics):
    topic_index = {}
    for i in range(len(topics)):
        topic_index[topics[i]] = i
    adj = np.array([[0.0 for i in range(len(topics))] for j in range(len(topics))])
    for a in authors:
        for t in a['topics']['relevent']:
            for i in range(len(t)):
                for j in range(i+1, len(t)):
                    if topic_index.has_key(t[i]) and topic_index.has_key(t[j]):
                        adj[topic_index[t[i]]][topic_index[t[j]]]+=1
                        adj[topic_index[t[j]]][topic_index[t[i]]]+=1
    sp = cluster.SpectralClustering(n_clusters = 10).fit(adj).labels_
    labels = {}
    for i in range(len(sp)):
        if not sp[i] in labels:
            labels[sp[i]] = []
        labels[sp[i]].append(topics[i])
    return labels