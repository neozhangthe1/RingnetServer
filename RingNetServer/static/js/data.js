var w = 1280,
    h = 800,
    rx = w / 2,
    ry = h / 2,
    r = 300;

var n = 36;
var unitTheta = 360.0/n;

nodes = new Array();
for (var i = 0 ;i < n ;i ++){
    nodes.push({"x":unitTheta*i,"y":r,"key":i});
}


