'''
Created on Dec 18, 2012

@author: Yutao
'''
from RingNetServer import settings
import pymongo

class Mongo(object):
    def __init__(self):
        self.con = pymongo.Connection(settings.MONGO_HOST,12345)
        self.db = self.con[settings.MONGO_NAME]
        #db
        self.doc_topic = self.db['doc_topic200']

    def get_author_pub(self,author):
        result = self.db["author_topic"].find({"_id":author})
        
    def store_doc_topic(self):
        import pymongo
        col = pymongo.Connection("10.1.1.110",12345)['ringnet']['papers']
        doc_topic = open('Z:\\personal\\yutao\\ringnet\\topic\\docTopic.txt')
        index = 0
        for line in doc_topic:
            if index%10000==0:
                print index
            index+=1
            item = {}
            x = line.strip().split('#')
            topics = {}
            ts = x[1].split(',')
            for t in ts:
                y = t.split(':')
                topics[int(y[0])]=float(y[1])
            tl = [0.0 for i in range(200)]
            for t in topics.keys():
                tl[t]=topics[t]
            item['_id']=int(x[0])
            item['topics']=tl
            top_topics = []
            sorted_topics = sorted(topics.iteritems(), key=lambda z:z[1], reverse=True)[:10]
            item['top_topics']=sorted_topics
            col.save(item)

    def get_author(self, id):
        col = pymongo.Connection("10.1.1.110",12345)['ringnet']['author_topic']
        cur = col.find({"_id":int(id)})
        if cur.count()>0:
            return cur.next()
        else:
            return None

    def get_author_data(self,authors,years):
        topic_set = set()
        author_set = []
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
        return author_set, list(topic_set)

    def get_author_data1(self,authors,years):
        topic_set = []
        author_set = []
        at_col = ['ringnet']['author_topic']
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
                        for t in range(len(author_topic[item["_id"]][i])):
                            if author_topic[item["_id"]][i][t]>0:
                                topic_set.append(t)
            except Exception,e:
                print e
        return author_set, list(topic_set)
            
if __name__ == "__main__":
    db = Mongo()
    db.store_doc_topic()
            