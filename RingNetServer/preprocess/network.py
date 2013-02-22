from RingNetServer.database import mysql


def get_triangles(g):
    for n1 in g.nodes:
        neighbors1 = set(g[n1])
        for n2 in filter(lambda x: x>n1, nodes):
            neighbors2 = set(g[n2])
            common = neighbors1&neighbors2
            for n3 in filter(lambda x: x>n2, common):
                yield n1,n2,n3
