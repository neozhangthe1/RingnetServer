var width = 960,
  height = 500,
  fill = d3.scale.category20();

var diameter = 960,
  radius = diameter / 2,
  innerRadius = radius - 120,
  center = {
    "x": radius,
    "y": radius
  };
var color = d3.scale.category20();

var AjaxRequest = {
  render: function(context,jconf,start,end){
      $.get('render/'+context+'?'+"jconf="+jconf+"&start="+start+"&end="+end+"&authors=10",function(data,textStatus,jqXHR){//window.location.href.slice(window.location.href.indexOf('?') + 1),function(data,textStatus,jqXHR){
        var topic = JSON.parse(data);
        ringnet(topic);
      })
  }
}
start = 2000;
end = 2010;
$("#jconf-select").change(function(){
  jconf = $(this).children(":selected").attr("value");
  AjaxRequest.render("topic", jconf, start, end);
})

var ringnet = function(json) {

  var dist = function(a, b) {
      return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
    }

  var dist = function(a, b, c, d) {
      return Math.sqrt((a - c) * (a - c) + (b - d) * (b - d));
    }
  var lineDotDist = function(a, b, c) {
      var ab = {},
        ac = {};
      ab.x = b.x - a.x
      ab.y = b.y - a.y
      ac.x = c.x - a.x
      ac.y = c.y - a.y
      return Math.abs(ab.x * ac.y - ab.y * ac.x) / dist(a, b);
    }


    // /var bundle = d3.layout.bundle();
    // var line = d3.svg.line.radial().interpolate("bundle").tension(.85).radius(function(d) {
    //   return d.y;
    // }).angle(function(d) {
    //   return d.x / 180 * Math.PI;
    // });
  var pattern = {
    // construct the json data
    load: function(json) {
      anchors = [];
      items = [];
      links = [];
      trajectories = [];
      nodes = [];
      meta = json["meta"];

      //load anchors
      var index = 0;
      for(a in json['anchors']) {
        for(b in json['anchors'][a]) {
          anchors[index] = {
            "fixed": true,
            "name": json['anchors'][a][b].topic,
            "group": a,
            "year": json['anchors'][a][b].year,
            "weight": json['anchors'][a][b].weight,
            "type": "anchor",
          };
          index++;
        }
      }
      n_anchors = index;
      // init position for anchors
      var dtheta = 2 * Math.PI / n_anchors;
      for(var i = 0; i < n_anchors; i++) {
        anchors[i].x = center.x + 0.9 * radius * Math.cos(dtheta * -i);
        anchors[i].y = center.y + 0.9 * radius * Math.sin(dtheta * -i);
        nodes[i] = anchors[i]
      }

      //load items
      json['items'].forEach(function(e) {
        e.x = center.x;
        e.y = center.y;
        e.fixed = false;
        e.type = "item";
        e.neighbors = [];
      });
      items = json['items'];

      // for(var i = 0; i < meta.num; i++){
      //   for(var j = 0; j < json["clusters"].lenght;)
      //    nodes[n_anchors + i] = items[i];
      // }
      for(var i = 0; i < items.length; i++) {
        nodes[n_anchors + i] = items[i];
      }

      //load links
      json['links'].forEach(function(e) {
        // w = 0;
        // if(json["cluster"][e.year][items[e.target].cluster][e.source]>.05){
        //   w = json["cluster"][e.year][items[e.target].cluster][e.source]
        // }
        // e.weight = json["cluster"][e.year][items[e.target].cluster][e.source]; //e.weight// Math.pow(json["cluster"][e.year][items[e.target].cluster][e.source],2)
        e.source = e.source * meta.num + e.offset;
        e.target = n_anchors + e.target;
        links.push(e);
        nodes[e.target].neighbors.push(e);
      });


      //load trajectories
      group = {}
      json['trajectories'].forEach(function(tr) {
        t = [];
        tr.forEach(function(e) {
          t.push(items[e]);
        });
        trajectories.push(t);
        token = "" + t[0].cluster + '.' + t[meta.num - 1].cluster;
        // for(var i = 0; i < t.length; i++) {
        //   token += t[i].cluster;
        //   token += '.';
        // }
        if(!group[token]) {
          group[token] = [];
        }
        group[token].push(t);
        t.group = token;
      });

      return {
        "anchors": anchors,
        "items": items,
        "nodes": nodes,
        "links": links,
        "trajectories": trajectories,
        "groups": group
      }
    }
  }



  var topic = pattern.load(json),
    anchors = topic.anchors,
    items = topic.items,
    groups = topic.groups,
    trajectories = topic.trajectories;

  var curve = [];

  nodes = topic.nodes;
  links = topic.links;

  //budle curve
  var bundle = function() {
      for(var token in groups) {
        x_mean = [];
        y_mean = [];
        for(var i = 0; i < meta.num; i++) {
          x_mean[i] = 0.0;
          y_mean[i] = 0.0;
        }
        count = 0
        groups[token].forEach(function(t) {
          for(var i = 0; i < meta.num; i++) {
            x_mean[i] += t[i].x;
            y_mean[i] += t[i].y;
          }
          count += 1
        })
        groups[token].mean = [];
        for(var i = 0; i < meta.num; i++) {
          x_mean[i] /= count;
          y_mean[i] /= count;
          groups[token].mean[i] = {
            "x": x_mean[i],
            "y": y_mean[i]
          }
        }
        groups[token].size = count;
      }
      for(var i = 0; i < trajectories.length; i++) {
        trajectories[i].cluser_size = groups[trajectories[i].group].size;
        curve[i] = {};
        curve[i].splines = []
        for(var j = 0; j < meta.num - 2; j++) {
          sp = {};
          sp.max = trajectories[i][j + 1].max;
          sp.control_points = [];
          sp.control_points.push(trajectories[i][j]);
          sp.control_points.push(trajectories[i][j + 1]);
          sp.control_points.push(trajectories[i][j + 2]);
          curve[i].splines.push(sp);
        }
        //curve[i].push(anchors[(trajectories[i][0].max)*meta.num]);
        // curve[i].push(trajectories[i][0]);
        // x = 0;
        // y = 0;
        // for(var j = 0; j < meta.num ; j++) {
        //   x+=trajectories[i][j].x;
        //   y+=trajectories[i][j].y;
        // }
        // for(var j = 0; j < meta.num; j++) {
        //   curve[i].push(trajectories[i][j]);
        // }
        // curve[i].push({'x':x/meta.num,'y':y/meta.num});
        // curve[i].push(trajectories[i][Math.floor(meta.num / 2)]);
        // curve[i].push(trajectories[i][meta.num - 1]);
        // curve[i].push(anchors[(trajectories[i][meta.num - 1].max + 1)*meta.num-1])
        //curve[i].push(anchors[(trajectories[i][0].max)*meta.num]);
        //curve[i].push(center);//(groups[trajectories[i].group].mean[meta.num - 1]);
        // 
        // curve[i].push(groups[trajectories[i].group].mean[Math.floor(meta.num/2)]);
        // curve[i].push(groups[trajectories[i].group].mean[meta.num - 1]);
        // 
        // curve[i].push(anchors[(trajectories[i][meta.num - 1].max + 1)*meta.num-1])
        // curve[i].sort(function(a, b) {
        //   return a.x - b.x;
        // });
      }
    }

    // mouse event vars
  var selected_node = null,
    selected_link = null,
    mousedown_link = null,
    mousedown_node = null,
    mouseup_node = null;

  // init svg
  // var outer = d3.select("#chart").append("svg:svg").attr("weight", diameter).attr("height", diameter)
  // .append("g").attr("transform", "translate(" + radius + "," + radius + ")").attr("pointer-events", "all");
  var outer = d3.select("#chart").append("svg:svg").attr("width", 1000).attr("height", 1000).attr("pointer-events", "all");

  var vis = outer.append('svg:g').call(d3.behavior.zoom().on("zoom", rescale)).on("dblclick.zoom", null).append('svg:g').on("mousemove", mousemove).on("mousedown", mousedown).on("mouseup", mouseup);

  vis.append('svg:rect').attr('width', width).attr('height', height).attr('fill', 'white');

  // init force layout
  var force = d3.layout.force().size([width, height]).nodes(nodes).links(links).linkDistance(0) // initialize with a single node
  .linkStrength(function(d) {
    return d.weight * d.weight;
  }).charge(function(d) {
    return 0;
    if(d.type == "anchor") {
      return 0; //1000;
    } else if(d.type == "item") {
      return 0; //5;
    }
  }).gravity(-0.0); //.on("tick", tick);
  // line displayed when dragging new nodes
  layout = function() {
    //document.write("===============<br>");
    // if(links.length == 0 || anchorNodes.length < 3) {
    //   console.log("need more links or anchors");
    //   return;
    // }
    var epsilon = 0.1;
    var changed = true;
    while(changed) {
      changed = false;
      //document.write("------------<br>")
      items.forEach(function(i) {
        var X = center.x;
        var Y = center.y;
        var sw = 1;
        var w;
        if(i.neighbors != undefined && i.neighbors != null) {
          i.neighbors.forEach(function(n) {
            w = n.weight * 10000;
            var k = n.source;
            X += nodes[k].x * w;
            Y += nodes[k].y * w;
            sw += w;
          });
          if(Math.abs(X - i.x * sw) > epsilon || Math.abs(Y - i.y * sw) > epsilon) {
            i.x = X / sw;
            i.y = Y / sw;
            changed = true;
          }
        } else {
          console.log("warning: no neighbor");
        }
      });
    }
  }

  var drag_line = vis.append("line").attr("class", "drag_line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 0);

  // get layout properties
  // var nodes = force.nodes(),
  //   links = force.links(),
  node = vis.selectAll(".node"), link = vis.selectAll(".link");

  //for cluster
  var kcluster = function() {
      cluster = {};
      var MAX_LOOP_COUNT;
      var blocks;
      var means;
      var points;
      var dimension;
      var clusterContents;
      var distances;
      var n, m;
      var sum;
      var clusterSizes = new Array();
      cluster.computeDistance = function(a, b) {
        var c = new Array();
        for(var i = 0; i < n; i++) {
          c[i] = new Array();
          for(var j = 0; j < m; j++) {
            c[i][j] = dist(a[i], a[i + n], b[i], b[i + m]);
          }
        }
        var dtw = new Array();
        for(var i = 0; i < n; i++) {
          dtw[i] = new Array();
        }
        dtw[0][0] = c[0][0];
        for(var j = 1; j < m; j++) {
          dtw[0][j] = dtw[0][j - 1] + c[0][j];
        }
        for(var i = 1; i < n; i++) {
          dtw[i][0] = dtw[i - 1][0] + c[i][0];
        }
        for(var i = 1; i < n; i++) {
          for(var j = 1; j < m; j++) {
            dtw[i][j] = Math.min(dtw[i - 1][j - 1], dtw[i - 1][j], dtw[i][j - 1]) + c[i][j];
          }
        }
        return dtw[n - 1][m - 1];
      }

      cluster.init = function(k) {
        console.log("haha");
        MAX_LOOP_COUNT = 15;
        blocks = k;
        means = new Array();
        clusterContents = new Array();
        sum = new Array();
        distances = new Array();
        dimension = meta.num * 2;
        n = meta.num;
        m = meta.num;
        points = new Array();
        for(var i = 0; i < blocks; i++) {
          mean = new Array();
          for(var j = 0; j < dimension; j++) {
            mean[j] = Math.floor(Math.random() * diameter);
          }
          means[i] = mean;
          clusterContents[i] = new Array();
        }
        for(var i = 0; i < trajectories.length; i++) {
          distances[i] = Infinity;
          sum[i] = new Array();
          points[i] = new Array();
          for(var j = 0; j < meta.num; j++) {
            points[i][j] = trajectories[i][j].x;
            points[i][j + meta.num] = trajectories[i][j].y;
          }
        }
        return cluster;
      }

      cluster.updatePolylines = function() {
        meanPolylines = new Array();
        for(var j = 0; j < means.length; j++) {
          meanPolylines[j] = new Array();
          var mean = means[j];
          for(var k = 0; k < meta.num; k++) {
            meanPolylines[j].push({
              "x": mean[k],
              "y": mean[k + meta.num]
            });
          }
        }
        for(var i = 0; i < trajectories.length; i++) {
          trajectories[i].cluser_size = clusterSizes[points[i].cluster];
          trajectories[i].cluster = points[i].cluster;
          curve[i] = {};
          curve[i].splines = [];
          curve[i].splines[0] = {};
          curve[i].splines[0].control_points = [];
          curve[i].splines[0].max = trajectories[i][0].max;
          // curve[i].push(anchors[(trajectories[i][0].max)*meta.num]);
          // curve[i].push(meanPolylines[points[i].cluster][0]);
          // curve[i].push(meanPolylines[points[i].cluster][meta.num - 1]);
          // curve[i].splines[0].control_points.push(trajectories[i][0]);
          for(var j = 1; j < meta.num; j++) {
            // damping = 80/Math.pow((Math.abs(j-meta.num/2)+1),2);
            damping = 300 / j;
            x = (meanPolylines[points[i].cluster][j].x + (trajectories[i][0].x - meanPolylines[points[i].cluster][j].x) / damping);
            y = (meanPolylines[points[i].cluster][j].y + (trajectories[i][0].y - meanPolylines[points[i].cluster][j].y) / damping);
            curve[i].splines[0].control_points.push({
              "x": x,
              "y": y
            });
            // curve[i].splines[0].control_points.push(trajectories[i][j]);
          }
          // curve[i].splines[0].control_points.push(trajectories[i][meta.num - 1]);
          // curve[i].push(anchors[(trajectories[i][meta.num - 1].max + 1)*meta.num-1]);
          // curve[i].sort(function(a, b) {
          //   return a.x - b.x;
          // });
        }
        // for(var i = 0; i < trajectories.length; i++) {
        //   trajectories[i].cluser_size = groups[trajectories[i].group].size;
        //   curve[i] = {};
        //   curve[i].splines = []
        //   for(var j = 0; j < meta.num - 2; j++) {
        //     sp = {};
        //     sp.max = trajectories[i][j + 1].max;
        //     sp.control_points = [];
        //     sp.control_points.push(trajectories[i][j]);
        //     sp.control_points.push(meanPolylines[points[i].cluster][j + 1]);
        //     sp.control_points.push(trajectories[i][j + 2]);
        //     curve[i].splines.push(sp);
        //   }
        // }
        return cluster;
      }

      cluster.kmeans = function() {
        console.log("start Kmeans")
        var converged = false;
        var dirty = false;
        var distance = 0.0;
        var curMinDistance = 0.0;
        var loopCount = 0;

        while(!converged) {
          console.log("iterate");
          dirty = false;
          for(var i = 0; i < points.length; i = i + 1) {

            point = points[i];
            curMinDistance = distances[i];
            for(var j = 0; j < means.length; j = j + 1) {

              mean = means[j];
              distance = this.computeDistance(point, mean);
              if(isNaN(distance)) {
                console.log(point);
                console.log(mean);
              }
              if(distance < curMinDistance) {

                dirty = true;
                curMinDistance = distance;
                point.cluster = j;
                distances[i] = distance;
              }
            }
          }
          if(!dirty) {
            converged = true;
            break;
          }
          for(var i = 0; i < means.length; i = i + 1) {
            for(var j = 0; j < dimension; j++) {
              sum[i][j] = 0;
            }
            clusterSizes[i] = 0;
          }
          for(var i = 0; i < points.length; i = i + 1) {
            var c = points[i].cluster;
            for(var j = 0; j < dimension; j++) {
              sum[c][j] += points[i][j];
            }
            clusterSizes[c]++;
          }
          for(var i = 0; i < means.length; i = i + 1) {

            if(clusterSizes[i] != 0) {

              for(var j = 0; j < dimension; j++) {
                means[i][j] = sum[i][j] / clusterSizes[i];
              }
            } else {
              for(var j = 0; j < dimension; j++) {
                means[i][j] = Math.floor(Math.random() * diameter);
              }
            }
          }
          loopCount = loopCount + 1;
          if(loopCount > MAX_LOOP_COUNT) {

            converged = true;
          }
        }
        means.forEach(function(e) {
          e.maxdis = -Infinity;
          e.sumdis = 0;
        });
        for(var i = 0; i < points.length; i++) {
          var p = points[i];
          if(means[p.cluster].maxdis < distances[i]) {
            means[p.cluster].maxdis = distances[i];
          }
          means[p.cluster].sumdis += distances[i];
        }
        for(var i = 0; i < means.length; i++) {
          console.log(means[i].maxdis, means[i].sumdis / clusterSizes[i], clusterSizes[i]);
        }
        return cluster;
      }

      cluster.initClusterContents = function() {
        clusterContents = {};
        for(var i = 0; i < points.length; i++) {
          var c = p.cluster;
          if(clusterContents[c] == undefined || clusterContents[c] == null) {
            clusterContents[c] = [];
          }
          clusterContents[c].push(i);
        }

        return cluster;

      }
      return cluster;
    }



    // add keyboard callback
    d3.select(window).on("keydown", keydown);

  redraw();

  // focus on svg
  // vis.node().focus();

  function mousedown() {
    if(!mousedown_node && !mousedown_link) {
      // allow panning if nothing is selected
      vis.call(d3.behavior.zoom().on("zoom"), rescale);
      return;
    }
  }

  function mousemove() {
    if(!mousedown_node) return;

    // update drag line
    drag_line.attr("x1", mousedown_node.x).attr("y1", mousedown_node.y).attr("x2", d3.svg.mouse(this)[0]).attr("y2", d3.svg.mouse(this)[1]);

  }

  function mouseup() {
    if(mousedown_node) {
      // hide drag line
      drag_line.attr("class", "drag_line_hidden")

      if(!mouseup_node) {
        // add node
        var point = d3.mouse(this),
          node = {
            x: point[0],
            y: point[1]
          },
          n = nodes.push(node);

        // select new node
        selected_node = node;
        selected_link = null;

        // add link to mousedown node
        links.push({
          source: mousedown_node,
          target: node
        });
      }

      redraw();
    }
    // clear mouse event vars
    resetMouseVars();
  }

  function resetMouseVars() {
    mousedown_node = null;
    mouseup_node = null;
    mousedown_link = null;
  }

  function tick() {
    node.attr("cx", function(d) {
      return d.x;
    }).attr("cy", function(d) {
      return d.y;
    }).attr("r", function(d) {
      if(d.type == "anchor") {
        return 5;
      } else if(d.type == "item") {
        return 2;
      }
    }).style("fill", function(d) {
      if(d.type == "anchor") {
        return color(d.group);
      } else if(d.type == "item") {
        return color(d.max);
      }

    });

    // var spline = d3.svg.line().radial().interpolate("bundle").tension(.0).radius(function(d) {
    //   return d.y;
    // }).angle(function(d) {
    //   return d.x;
    // });
    // x(function(d) {
    //   return d.x;
    // }).y(function(d) {
    //   return d.y;
    // }).interpolate("basis");
    for(var i = 0; i < trajectories.length; i++) {
      for(var j = 0; j < trajectories[i].length - 1; j++) {
        vis.selectAll("path.topic-trajectory" + i).data(trajectories[i]).enter().append("line").attr("class", "topic-trajectory" + i).attr("x1", trajectories[i][j].x).attr("y1", trajectories[i][j].y).attr("x2", trajectories[i][j + 1].x).attr("y2", trajectories[i][j + 1].y).style("stroke", trajectories[i][j].max);
      }
    }
    //   }
    //   //
    //     spline(trajectories[i]))
    // }
    // vis.selectAll("path.topic-trajectory" + i).data(trajectories[i]).enter().append("path").attr("class", "topic-trajectory" + i).attr("d", spline(trajectories[i])).style("stroke", function(d) {
    //   if(d.highlight) {
    //     return "red";
    //   } else if(topic.primary) {
    //     return color(d[0].max);
    //   } else {
    //     return "darkgray";
    //   }
    // })
    //   .style("fill", function(d) {
    //     return "transparent";
    //   }).style("z-index", function() {
    //     if(topic.primary) {
    //       return 2;
    //     } else {
    //       return 1;
    //     }
    //   }).style("stroke-width", function(d) {
    //     return 0.1;
    //   });
    // }
    // link.attr("x1", function(d) {
    //   return d.source.x;
    // }).attr("y1", function(d) {
    //   return d.source.y;
    // }).attr("x2", function(d) {
    //   return d.target.x;
    // }).attr("y2", function(d) {
    //   return d.target.y;
    // });
    // node.attr("cx", function(d) {
    //   return d.x;
    // }).attr("cy", function(d) {
    //   return d.y;
    // });
  }

  // rescale g

  function rescale() {
    trans = d3.event.translate;
    scale = d3.event.scale;

    vis.attr("transform", "translate(" + trans + ")" + " scale(" + scale + ")");
  }

  // redraw force layout

  function redraw() {

    link = link.data(links);

    link.enter().insert("line", ".node").attr("class", "link").on("mousedown", function(d) {
      mousedown_link = d;
      if(mousedown_link == selected_link) selected_link = null;
      else selected_link = mousedown_link;
      selected_node = null;
      redraw();
    })

    link.exit().remove();

    link.classed("link_selected", function(d) {
      return d === selected_link;
    });

    node = node.data(nodes);

    node.enter().insert("circle").attr("class", "node").attr("r", .5).on("mousedown", function(d) {
      // disable zoom
      vis.call(d3.behavior.zoom().on("zoom"), null);

      mousedown_node = d;
      if(mousedown_node == selected_node) selected_node = null;
      else selected_node = mousedown_node;
      selected_link = null;

      // reposition drag line
      drag_line.attr("class", "link").attr("x1", mousedown_node.x).attr("y1", mousedown_node.y).attr("x2", mousedown_node.x).attr("y2", mousedown_node.y);

      redraw();
    }).on("mousedrag", function(d) {
      // redraw();
    }).on("mouseup", function(d) {
      if(mousedown_node) {
        mouseup_node = d;
        if(mouseup_node == mousedown_node) {
          resetMouseVars();
          return;
        }

        // add link
        var link = {
          source: mousedown_node,
          target: mouseup_node
        };
        links.push(link);

        // select new link
        selected_link = link;
        selected_node = null;

        // enable zoom
        vis.call(d3.behavior.zoom().on("zoom"), rescale);
        redraw();
      }
    }).transition().duration(750).ease("elastic"); //.attr("r", 6.5);
    node.exit().transition().attr("r", 0).remove();

    node.classed("node_selected", function(d) {
      return d === selected_node;
    });


    if(d3.event) {
      // prevent browser's default behavior
      d3.event.preventDefault();
    }
    var n = 100;
    layout();
    // force.start();
    // for(var i = n * n; i > 0; --i) force.tick();
    // force.stop();
    // link.attr("x1", function(d) {
    //   return d.source.x;
    // }).attr("y1", function(d) {
    //   return d.source.y;
    // }).attr("x2", function(d) {
    //   return d.target.x;
    // }).attr("y2", function(d) {
    //   return d.target.y;
    // });
    node.attr("cx", function(d) {
      if(d.type == "anchor") {
        return(d.x - center.x) * 10 / 9 + center.x;
      } else {
        cur_radius = Math.sqrt(Math.pow(d.x - center.x, 2) + Math.pow(d.y - center.y, 2))
        if(cur_radius > radius) {
          return d.x = (d.x - center.x) * radius / cur_radius + center.x
        } else {
          return d.x;
        }
      }
    }).attr("cy", function(d) {
      if(d.type == "anchor") {
        return(d.y - center.y) * 10 / 9 + center.y;
      } else {
        cur_radius = Math.sqrt(Math.pow(d.x - center.x, 2) + Math.pow(d.y - center.y, 2))
        if(cur_radius > radius) {
          return d.y = (d.y - center.y) * radius / cur_radius + center.y
        } else {
          return d.y;
        }
      }
    }).attr("r", function(d) {
      if(d.type == "anchor") {
        return 5;
      } else if(d.type == "item") {
        return 0.2;
      }
    }).style("fill", function(d) {
      if(d.type == "anchor") {
        return color(d.group);
      } else if(d.type == "item") {
        return color(d.max);
      }

    });


    // var lined = d3.svg.line.radial().interpolate("bundle").tension(.85).radius(function(d) {
    //   return d.y;
    // }).angle(function(d) {
    //   return d.x / 180 * Math.PI;
    // });
    // var splin2e = d3.svg.line().x(function(d) {
    //   return d.x;
    // }).y(function(d, i) {
    //   return d.y;
    // }).interpolate("cardinal");
    // var splin3e = d3.svg.line().radial().interpolate("bundle").tension(.0).radius(function(d) {
    //   return d.y;
    // }).angle(function(d) {
    //   return d.x;
    // });
    var spline = d3.svg.line().x(function(d) {
      return d.x;
    }).y(function(d) {
      return d.y;
    }).interpolate("basis");
    // bundle();
    var topicCluster = kcluster().init(300);
    topicCluster.kmeans().updatePolylines();
    // for(var i = 0; i < trajectories.length; i++) {
    //   for(var j = 0; j < trajectories[i].length - 1; j++) {
    //     vis.selectAll("path.topic-trajectory" + i).data(trajectories[i]).enter().append("line")
    //     .attr("class", "topic-trajectory" + i).attr("x1", trajectories[i][j].x).attr("y1", trajectories[i][j].y)
    //     .attr("x2", trajectories[i][j + 1].x).attr("y2", trajectories[i][j + 1].y)
    //     .style("stroke", color(trajectories[i][j + 1].max)).style("stroke-width", 0.1).style("opacity", 0.2);
    //   }
    // }
    for(var i = 0; i < trajectories.length; i++) {
      // if(trajectories[i].cluster_size < 3) {
      //   continue;
      // }
      // var gradient = vis.append("linearGradient").attr("id", "gradient" + i).attr("gradientUnits", "objectBoundingBox").attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%")
      for(var j = 0; j < curve[i].splines.length; j++) {
        // gradient.append("stop").attr("offset", 0).attr("stop-color", color(trajectories[i][j].max));
        vis.selectAll("path.topic-trajectory" + i + "-" + j).data(curve[i].splines[j].control_points).enter().append("path").attr("class", "topic-trajectory" + i).attr("d", spline(curve[i].splines[j].control_points)).style("stroke", function(d) {
          return color(curve[i].splines[j].max);
        }).style("fill", "transparent").style("z-index", function() {
          if(topic.primary) {
            return 2;
          } else {
            return 1;
          }
        }).style("stroke-width", function(d) {
          return 0.3;
        }).style("opacity", 0.2);
      }

    }
  }

  function spliceLinksForNode(node) {
    toSplice = links.filter(

    function(l) {
      return(l.source === node) || (l.target === node);
    });
    toSplice.map(

    function(l) {
      links.splice(links.indexOf(l), 1);
    });
  }

  function keydown() {
    if(!selected_node && !selected_link) return;
    switch(d3.event.keyCode) {
    case 8:
      // backspace
    case 46:
      { // delete
        if(selected_node) {
          nodes.splice(nodes.indexOf(selected_node), 1);
          spliceLinksForNode(selected_node);
        } else if(selected_link) {
          links.splice(links.indexOf(selected_link), 1);
        }
        selected_link = null;
        selected_node = null;
        redraw();
        break;
      }
    }
  }
}