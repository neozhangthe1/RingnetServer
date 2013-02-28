# Create your views here.
def render_coevo(request):
    start = int(request.GET['start'])
    end = int(request.GET['end'])
    aus = request.GET['authors']
    years = [start,end]
    authors = []
    for y in aus.strip('"').split(','):
        authors.append(int(y.strip()))
    #years = [2009,2010]#request.GET['range']
    #authors = [745329,265966,575748]#request.GET['authors']
    pattern = {"range":[], "categories":[], "time":(start+end)/2, "focus": []}
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

def coevolution(request):
    return render_to_response("ringnet.html")