from whoosh.index import create_in, open_dir
from whoosh.fields import *
from whoosh.analysis import RegexAnalyzer
from whoosh.query import Term
import pymongo
import MySQLdb
from bs4 import UnicodeDammit
from RingNetServer import settings

class Whoosh(object):
    def __init__(self):
        self.index = open_dir(settings.INDEX_DIR, readonly=False)
        self.searcher = self.index.searcher()
        self.writer = self.index.writer()
    def search(self, query):
        return self.searcher.find("content", UnicodeDammit(query).markup)
    def search_title(self,query):
        return self.searcher.find("path",  UnicodeDammit(query).markup)
    def append(self, title, content, path):
        self.writer.update_document(title=UnicodeDammit(title).markup, path=unicode(path), content=UnicodeDammit(content).markup)
        self.writer.commit()

def build():
    db = MySQLdb.connect(host="10.1.1.110",
                              user="root",
                              passwd="keg2012",
                              db="arnet_db")
    cur = db.cursor()
    col = pymongo.Connection("10.1.1.110",12345)["ringnet"]["author_topic"]
    SQL_GET_AUTHORS_NAME = "SELECT id,names FROM na_person WHERE id = %s"
    schema = Schema(title=TEXT(stored=True), path=ID(stored=True), content=TEXT(stored=True))
    ix = create_in("D:\share\yutao\index", schema)
    writer = ix.writer()
    index=0
    for item in col.find(skip=600000):
        if index % 10000 == 0:
            print "%s %s"%(index, item["_id"])
        index+=1
        cur.execute(SQL_GET_AUTHORS_NAME%item["_id"])
        name = ""
        for x in cur.fetchall():
            names = x[1]
        name = x[1].split(",")[0]
        if name == "":
            name="name"
        try:
            writer.update_document(title=UnicodeDammit(name).markup, path=unicode(item["_id"]), content=UnicodeDammit(names).markup)
        except:
            pass
    writer.commit()



