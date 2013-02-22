'''
Created on Jan 8, 2013

@author: Yutao
'''

class Pattern(object):
    def __init__(self, label):
        self.label = label
        self.anchors = {}
        self.items = []
        self.links = []
        self.trajectories = []