from collections import defaultdict
def sort_comm():
    f = open("communities.txt")
    comm_dict = {}
    for line in f:
        if line[0] == "#":
            continue
        x=line.split('\t')
        l = []
        for i in range(1, len(x)):
            l.append(int(x[i]))
        comm_dict[int(x[0])]=l
    sort_comm = sorted(comm_dict.items(), key = lambda x:len(x[1]), reverse=True)
    author_comm = defaultdict(list)
    for c in range(100):
        for i in sort_comm[c][1]:
            author_comm[i].append(sort_comm[c][0])

from collections import defaultdict
f = open(("communities.txt").replace('\\','/'))
author_comm = {}
comm_author = defaultdict(list)
for line in f:
    if line[0] == "#":
        continue
    x=line.split('\t')
    author_comm[int(x[0])]=int(x[1])
    comm_author[int(x[1])].append(int(x[0]))
pub_comm = defaultdict(list)
comm_year_pub = defaultdict(lambda: defaultdict(list))
import MySQLdb
db = MySQLdb.connect(host="10.1.1.110",
                               user="root",
                               passwd="keg2012",
                               db="arnet_db")
cur = db.cursor()
coauthors = [] 
pub_author = defaultdict(list)
author_comm_paper = defaultdict(lambda: defaultdict(int))
SQL_GET_COAUTHORS_NETWORK = "SELECT aid, pid FROM na_author2pub n"
cur.execute(SQL_GET_COAUTHORS_NETWORK)
index = 0
for item in cur.fetchall():
    if index%1000==0:
        print index
    pub_author[item[1]].append(item[0])
    index+=1
author_pub_count = defaultdict(list)
for p in pub_author:
    for a in pub_author[p]:
        author_pub_count[a].append(p)
high_author = {}
for c in comm_author:
    z = sorted(comm_author[c], key=lambda x: len(author_pub_count[x]), reverse=True)
    high_author[c] = z[:10]
aus = []
for c in high_author:
    for a in high_author[c]:
        aus.append(a)
name_dict = get_name(aus)
comm_label = {}
for c in high_author:
    comm_label[c] = []
    for a in high_author[c]:
        if name_dict.has_key(a):
            comm_label[c].append(name_dict[a])
out = open("comm_label.pickle",'w')
pickle.dump(comm_label,out)
out.close()


import pickle
out = open("pub_comm",'w')
pickle.dump(pub_comm,out)
out.close()

sim_dict = defaultdict(lambda: defaultdict(int))
for i1 in range(len(pub_comm)):
    for i2 in range(i1+1, len(pub_comm)):
        x = set(pub_comm[i1]) & set(pub_comm[i2])
        if len(x)>0:
            sim_dict[i1][i2] == len(x)



def get_edges():
    import MySQLdb
    db = MySQLdb.connect(host="10.1.1.110",
                                   user="root",
                                   passwd="keg2012",
                                   db="arnet_db")
    cur = db.cursor()
    coauthors = [] 
    SQL_GET_COAUTHORS_NETWORK = "SELECT pid1,pid2,similarity,rel_type FROM na_person_relation"
    cur.execute(SQL_GET_COAUTHORS_NETWORK)
    for item in cur.fetchall():
        if item[2]>5:
            coauthors.append((item[0],item[1]))
    out = open("graph.txt",'w')
    for c in coauthors:
        if c[0]!=-1 and c[1]!=-1:
            out.write("%s\t%s\n"%(c[0],c[1]))
    out.close()

def get_name(pids):
    import MySQLdb
    db = MySQLdb.connect(host="10.1.1.110",
                                   user="root",
                                   passwd="keg2012",
                                   db="arnet_db")
    cur = db.cursor()
    coauthors = [] 
    id = ""
    id+=str(pids[0])
    for pid in pids[1:]:
        id+=","
        id+=str(pid)
    SQL_GET_COAUTHORS_NETWORK = "SELECT id,names FROM na_person WHERE id in (%s)"%id
    cur.execute(SQL_GET_COAUTHORS_NETWORK)
    name_dict = {}
    for item in cur.fetchall():
        name_dict[item[0]] = item[1].split(',')[0]
    return name_dict

def get_publication_authors(self,pids):
    id = ""
    id+=str(pids[0])
    for pid in pids[1:]:
        id+=","
        id+=str(pid)
    self.cur.execute(SQL_GET_PUBLICATION_AUTHORS % id)
    res = self.cur.fetchall()
    pub_dict = defaultdict(list)
    for item in res:
        pub_dict[item[1]].append(item[0])
    return pub_dict