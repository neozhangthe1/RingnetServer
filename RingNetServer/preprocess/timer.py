import threading, time
import urllib2

def wget():
    try:
        response = urllib2.urlopen("http://ec2.thinxer.com:18080/ringnet")
        print response.read()
    except Exception,e:
        print e

if __name__ == "__main__":
    while True:
        wget()
        time.sleep(10)