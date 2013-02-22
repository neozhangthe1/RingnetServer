from collections import defaultdict
def coathor_to_rel():
    f = open("coauthors.txt")
    rel_dict = defaultdict(int)
    index = 0
    for line in f:
        if index%1000==0:
            print index
        index+=1
        x = line.strip().split(':')
        y = x[1].split(' ')
        for i in range(len(y)):
            for j in range(i+1, len(y)):
                a1 = int(y[i])
                a2 = int(y[j])
                if a2<a1:
                    a1,a2 = a2,a1
                rel_dict[(a1,a2)]+=1
    out = open("rel2_nw.txt",'w')
    for k in rel_dict:
        if rel_dict[k]>2:
            out.write("%s\t%s\n"%(k[0],k[1]))
    out.close()