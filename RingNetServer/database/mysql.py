'''
Created on Dec 18, 2012

@author: Yutao
'''

import MySQLdb
from bs4 import UnicodeDammit

SQL_GET_PUBLICATION = "SELECT id,title,jconf,year FROM publication WHERE year>1999"
SQL_GET_ABSTRACT = "SELECT abstract FROM publication_ext WHERE id = %s"
SQL_GET_JCONF_NAME = "SELECT name FROM jconf WHERE id = %s"
SQL_GET_COAUTHORS = "SELECT pid1,pid2,similarity,rel_type FROM na_person_relation WHERE pid1 = %s or pid2 = %s"
SQL_GET_COAUTHORS_NETWORK = "SELECT pid1,pid2,similarity,rel_type FROM na_person_relation WHERE pid1 in %s or pid2 in %s"
SQL_GET_RELATION = "SELECT pid1,pid2,similarity,rel_type FROM na_person_relation WHERE pid1 <> -1 and pid2 <> -1 and similarity > %s"
SQL_GET_JCONF = "SELECT id,name,score FROM jconf"
SQL_GET_JCONF_TOPIC = "SELECT * FROM conftopic WHERE conference_id = %s"
SQL_GET_PUBLICATION_BY_JCONF = "SELECT p.id,p.title,p.jconf,p.year,a.aid FROM publication p,na_author2pub a WHERE jconf = %s AND year>%s AND year<%s AND p.id = a.pid"
SQL_GET_AUTHORS_NAME = "SELECT id,names FROM na_person WHERE id in %s"
DB_HOST = "10.1.1.110"
DB_USER = "root"
DB_PORT = 3306
DB_PASS = "keg2012"
DB_NAME = "arnet_db"

class Mysql(object):
    def __init__(self):
        self.SQL_GET_PERSON_PUBLICATION = "SELECT ap.pid, p.`year` FROM na_author2pub ap, publication p WHERE ap.aid = %s and p.id = ap.pid and p.`year`>=2000 and p.`year`<=2009"
        self.db = MySQLdb.connect(host="10.1.1.110",
                                       user=DB_USER,
                                       passwd=DB_PASS,
                                       db=DB_NAME)
        self.cur = self.db.cursor()
        
    def get_person_publications(self,pid):
        self.cur.execute(self.SQL_GET_PERSON_PUBLICATION % pid)
        papers = {}
        for i in range(2000,2010):
            papers[i] = []
        for p in self.cur.fetchall():
            papers[p[1]].append(p[0])
        return papers
    
    def get_paper_content(self):
        self.cur.execute(SQL_GET_PUBLICATION)
        for item in self.cur.fetchall():
            content = item[1]+'\n'
            pid = item[0]
            if pid%1000 == 0:
                print pid
            self.cur.execute(SQL_GET_ABSTRACT % pid)
            for abs in self.cur.fetchall():
                if abs[0]!=None:
                    content+=abs[0]
                    content+="\n"
            if item[2]!=None:
                self.cur.execute(SQL_GET_JCONF_NAME % item[2])
                for jconf in self.cur.fetchall():
                    if jconf[0]!=None:
                        content+=jconf[0]
                        content+="\n"
            yield pid, item[3], content   

    def get_paper_by_jconf(self, jconf, start, end):
        self.cur.execute(SQL_GET_PUBLICATION_BY_JCONF%(jconf, start, end))
        papers = defaultdict(lambda: defaultdict(list))
        authors = defaultdict(lambda: defaultdict(list))
        for p in self.cur.fetchall():
            papers[p[3]][p[0]].append(p[4])
            authors[p[4]][p[3]].append(p[0])
        return papers,authors

    def get_paper_authors(self, pid):
        self.cur.execute("SELECT ap.aid FROM na_author2pub ap WHERE ap.pid = %s" %pid)
        authors = []
        for item in self.cur.fetchall():
            authors.append(item[0])
        return authors

    def get_coauthors(self, pids):
        coauthors = set()
        for pid in pids:
            self.cur.execute(SQL_GET_COAUTHORS%(pid,pid))
            for item in self.cur.fetchall():
                coauthors.add(item[0])
                coauthors.add(item[1])
        return list(coauthors)
    
    def filter_relation(self, res, threshold):
        coauthors = set()
        for item in res:
            if item[2]>threshold:
                coauthors.add(item[0])
                coauthors.add(item[1])
        return coauthors

    def get_two_hop_network(self, pid):
        coauthors = set()
        one_hop = ""
        self.cur.execute(SQL_GET_COAUTHORS%(pid,pid))
        for item in self.cur.fetchall():
            coauthors.add(item[0])
            coauthors.add(item[1])
        flag = 0
        for c in coauthors:
            if flag != 0:
                one_hop+=','
            else:
                flag = 1
            one_hop+=str(c)
        one_hop = "("+one_hop+")"
        self.cur.execute(SQL_GET_COAUTHORS_NETWORK%(one_hop,one_hop))
        x = self.cur.fetchall()
        floor = 0
        ceiling = 50
        cur = (floor+ceiling)/2
        while True:
            coauthors = self.filter_relation(x, floor)
            if len(coauthors)<1000:
                return list(coauthors)
            coauthors = self.filter_relation(x, cur)
            if len(coauthors)>1000:
                floor = cur
            elif len(coauthors)<500:
                ceiling = cur
            else:
                return list(coauthors)
            cur = (floor+ceiling)/2           

    def get_tight_relation(self, tightness = 50):
        self.cur.execute(SQL_GET_RELATION%(tightness))
        #relation = []
        #for item in self.cur.fetchall():
        #    relation.append(item)
        return self.cur.fetchall()

    def get_conference(self):
        self.cur.execute(SQL_GET_JCONF)
        conf = []
        for c in self.cur.fetchall():
            conf.append((c[0],UnicodeDammit(c[1]).markup,c[2]))
        return conf

    def get_conference_topic(self,jconf):
        self.cur.execute(SQL_GET_JCONF_TOPIC%jconf)
        return self.cur.fetchall()

    def get_authors_name(self,aids):
        id = ""
        id+=str(aids[0])
        for aid in aids[1:]:
            id+=","
            id+=str(aid)
        id = "("+id+")"
        self.cur.execute(SQL_GET_AUTHORS_NAME%id)
        names = []
        res = self.cur.fetchall()
        for item in res:
            names.append((item[0],UnicodeDammit(item[1]).markup))
        return names

    def get_authors_name_dict(self,aids):
        name_dict = {}
        names = self.get_authors_name(aids)
        for n in names:
            name_dict[n[0]] = n[1]
        return name_dict

