function quadtree(points, x1, y1, x2, y2) {
  function insert(n, p, x1, y1, x2, y2) {
    if(isNaN(p.x) || isNaN(p.y)) return;
    if(n.leaf) {
      var v = n.point;
      if(v) {
        if(Math.abs(v.x - p.x) + Math.abs(v.y - p.y) < .01) {
          insertChild(n, p, x1, y1, x2, y2);
        } else {
          n.point = null;
          insertChild(n, v, x1, y1, x2, y2);
          insertChild(n, p, x1, y1, x2, y2);
        }
      } else {
        n.point = p;
      }
    } else {
      insertChild(n, p, x1, y1, x2, y2);
    }
  }

  function insertChild(n, p, x1, y1, x2, y2) {
    var sx = (x1 + x2) * .5,
      sy = (y1 + y2) * .5,
      right = p.x >= sx,
      bottom = p.y >= sy,
      i = (bottom << 1) + right;
    n.leaf = false;
    n = n.nodes[i] || (n.nodes[i] = d3_geom_quadtreeNode());
    if(right) x1 = sx;
    else x2 = sx;
    if(bottom) y1 = sy;
    else y2 = sy;
    insert(n, p, x1, y1, x2, y2);
  }
  var p, i = -1,
    n = points.length;
  if(n && isNaN(points[0].x)) points = points.map(d3_geom_quadtreePoint);
  if(arguments.length < 5) {
    if(arguments.length === 3) {
      y2 = x2 = y1;
      y1 = x1;
    } else {
      x1 = y1 = Infinity;
      x2 = y2 = -Infinity;
      while(++i < n) {
        p = points[i];
        if(p.x < x1) x1 = p.x;
        if(p.y < y1) y1 = p.y;
        if(p.x > x2) x2 = p.x;
        if(p.y > y2) y2 = p.y;
      }
      var dx = x2 - x1,
        dy = y2 - y1;
      if(dx > dy) y2 = y1 + dx;
      else x2 = x1 + dy;
    }
  }
  var root = d3_geom_quadtreeNode();
  root.add = function(p) {
    insert(root, p, x1, y1, x2, y2);
  };
  root.visit = function(f) {
    d3_geom_quadtreeVisit(f, root, x1, y1, x2, y2);
  };
  points.forEach(root.add);
  return root;
};

function d3_geom_quadtreeNode() {
  return {
    leaf: true,
    nodes: [],
    point: null
  };
}

function d3_geom_quadtreeVisit(f, node, x1, y1, x2, y2) {
  if(!f(node, x1, y1, x2, y2)) {
    var sx = (x1 + x2) * .5,
      sy = (y1 + y2) * .5,
      children = node.nodes;
    if(children[0]) d3_geom_quadtreeVisit(f, children[0], x1, y1, sx, sy);
    if(children[1]) d3_geom_quadtreeVisit(f, children[1], sx, y1, x2, sy);
    if(children[2]) d3_geom_quadtreeVisit(f, children[2], x1, sy, sx, y2);
    if(children[3]) d3_geom_quadtreeVisit(f, children[3], sx, sy, x2, y2);
  }
}

function d3_geom_quadtreePoint(p) {
  return {
    x: p[0],
    y: p[1]
  };
}
d3.geom.quadtree = function(points, x1, y1, x2, y2) {
  function insert(n, p, x1, y1, x2, y2) {
    if(isNaN(p.x) || isNaN(p.y)) return;
    if(n.leaf) {
      var v = n.point;
      if(v) {
        if(Math.abs(v.x - p.x) + Math.abs(v.y - p.y) < .01) {
          insertChild(n, p, x1, y1, x2, y2);
        } else {
          n.point = null;
          insertChild(n, v, x1, y1, x2, y2);
          insertChild(n, p, x1, y1, x2, y2);
        }
      } else {
        n.point = p;
      }
    } else {
      insertChild(n, p, x1, y1, x2, y2);
    }
  }
}

function d3_layout_forceAccumulate(quad, alpha, charges) {
  var cx = 0,
    cy = 0;
  quad.charge = 0;
  if(!quad.leaf) {
    var nodes = quad.nodes,
      n = nodes.length,
      i = -1,
      c;
    while(++i < n) {
      c = nodes[i];
      if(c == null) continue;
      d3_layout_forceAccumulate(c, alpha, charges);

      // flag = 1;
      // if(quad.point != null && c.point != null) {
      //   if(c.point.type == "item" && quad.point.type == "item") {
      //     if(c.point.year == quad.point.year) {
      //       if(c.point.max == quad.point.max) {
      //         flag = -1;
      //       }
      //     }
      //   }
      // }
      quad.charge += c.charge;
      cx += c.charge * c.cx;
      cy += c.charge * c.cy;
    }
  }
  if(quad.leaf) {
    cx = cx;
  }
  if(quad.point) {
    if(!quad.leaf) {
      quad.point.x += Math.random() - .5;
      quad.point.y += Math.random() - .5;
    }
    var k = alpha * charges[quad.point.index];
    quad.charge += quad.pointCharge = k;
    cx += k * quad.point.x;
    cy += k * quad.point.y;
  }
  quad.cx = cx / quad.charge;
  quad.cy = cy / quad.charge;
}

function d3_layout_forceLinkDistance(link) {
  return 20;
}

function d3_layout_forceLinkStrength(link) {
  return 1;
}

function d3_functor(v) {
  return typeof v === "function" ? v : function() {
    return v;
  };
}

d3.layout.force_mod = function() {
  function repulse(node) {
    return function(quad, x1, y1, x2, y2) {
      if(quad.point !== node) {
        var dx = quad.cx - node.x,
          dy = quad.cy - node.y,
          dn = 1 / Math.sqrt(dx * dx + dy * dy);
        if((x2 - x1) * dn < theta) {
          var k = quad.charge * dn * dn;
          node.px -= dx * k;
          node.py -= dy * k;
          return true;
        }
        if(quad.point && isFinite(dn)) {
          var k = quad.pointCharge * dn * dn;
          node.px -= dx * k;
          node.py -= dy * k;
        }
      }
      return !quad.charge;
    };
  }

  function dragmove(d) {
    d.px = d3.event.x;
    d.py = d3.event.y;
    force.resume();
  }
  var force = {},
    event = d3.dispatch("start", "tick", "end"),
    size = [1, 1],
    drag, alpha, friction = .9,
    linkDistance = d3_layout_forceLinkDistance,
    linkStrength = d3_layout_forceLinkStrength,
    charge = -30,
    gravity = .1,
    theta = .8,
    interval, nodes = [],
    links = [],
    distances, strengths, charges;
  force.tick = function() {
    if((alpha *= .99) < .005) {
      event.end({
        type: "end",
        alpha: alpha = 0
      });
      return true;
    }
    var n = nodes.length,
      m = links.length,
      q, i, o, s, t, l, k, x, y;
    for(i = 0; i < m; ++i) {
      o = links[i];
      s = o.source;
      t = o.target;
      x = t.x - s.x;
      y = t.y - s.y;
      if(l = x * x + y * y) {
        l = alpha * strengths[i] * ((l = Math.sqrt(l)) - distances[i]) / l;
        x *= l;
        y *= l;
        t.x -= x * (k = s.weight / (t.weight + s.weight));
        t.y -= y * k;
        s.x += x * (k = 1 - k);
        s.y += y * k;
      }
    }
    if(k = alpha * gravity) {
      x = size[0] / 2;
      y = size[1] / 2;
      i = -1;
      if(k) while(++i < n) {
        o = nodes[i];
        o.x += (x - o.x) * k;
        o.y += (y - o.y) * k;
      }
    }
    if(1) {
      d3_layout_forceAccumulate(q = quadtree(nodes), alpha, charges);
      i = -1;
      while(++i < n) {
        if(!(o = nodes[i]).fixed) {
          q.visit(repulse(o));
        }
      }
    }
    i = -1;
    while(++i < n) {
      o = nodes[i];
      if(o.fixed) {
        o.x = o.px;
        o.y = o.py;
      } else {
        o.x -= (o.px - (o.px = o.x)) * friction;
        o.y -= (o.py - (o.py = o.y)) * friction;
      }
    }
    event.tick({
      type: "tick",
      alpha: alpha
    });
  };
  force.nodes = function(x) {
    if(!arguments.length) return nodes;
    nodes = x;
    return force;
  };
  force.links = function(x) {
    if(!arguments.length) return links;
    links = x;
    return force;
  };
  force.size = function(x) {
    if(!arguments.length) return size;
    size = x;
    return force;
  };
  force.linkDistance = function(x) {
    if(!arguments.length) return linkDistance;
    linkDistance = d3_functor(x);
    return force;
  };
  force.distance = force.linkDistance;
  force.linkStrength = function(x) {
    if(!arguments.length) return linkStrength;
    linkStrength = d3_functor(x);
    return force;
  };
  force.friction = function(x) {
    if(!arguments.length) return friction;
    friction = x;
    return force;
  };
  force.charge = function(x) {
    if(!arguments.length) return charge;
    charge = typeof x === "function" ? x : +x;
    return force;
  };
  force.gravity = function(x) {
    if(!arguments.length) return gravity;
    gravity = x;
    return force;
  };
  force.theta = function(x) {
    if(!arguments.length) return theta;
    theta = x;
    return force;
  };
  force.alpha = function(x) {
    if(!arguments.length) return alpha;
    if(alpha) {
      if(x > 0) alpha = x;
      else alpha = 0;
    } else if(x > 0) {
      event.start({
        type: "start",
        alpha: alpha = x
      });
      d3.timer(force.tick);
    }
    return force;
  };
  force.start = function() {
    function position(dimension, size) {
      var neighbors = neighbor(i),
        j = -1,
        m = neighbors.length,
        x;
      while(++j < m) if(!isNaN(x = neighbors[j][dimension])) return x;
      return Math.random() * size;
    }

    function neighbor() {
      if(!neighbors) {
        neighbors = [];
        for(j = 0; j < n; ++j) {
          neighbors[j] = [];
        }
        for(j = 0; j < m; ++j) {
          var o = links[j];
          neighbors[o.source.index].push(o.target);
          neighbors[o.target.index].push(o.source);
        }
      }
      return neighbors[i];
    }
    var i, j, n = nodes.length,
      m = links.length,
      w = size[0],
      h = size[1],
      neighbors, o;
    for(i = 0; i < n; ++i) {
      (o = nodes[i]).index = i;
      o.weight = 0;
    }
    distances = [];
    strengths = [];
    for(i = 0; i < m; ++i) {
      o = links[i];
      if(typeof o.source == "number") o.source = nodes[o.source];
      if(typeof o.target == "number") o.target = nodes[o.target];
      distances[i] = linkDistance.call(this, o, i);
      strengths[i] = linkStrength.call(this, o, i);
      ++o.source.weight;
      ++o.target.weight;
    }
    for(i = 0; i < n; ++i) {
      o = nodes[i];
      if(isNaN(o.x)) o.x = position("x", w);
      if(isNaN(o.y)) o.y = position("y", h);
      if(isNaN(o.px)) o.px = o.x;
      if(isNaN(o.py)) o.py = o.y;
    }
    charges = [];
    if(typeof charge === "function") {
      for(i = 0; i < n; ++i) {
        charges[i] = +charge.call(this, nodes[i], i);
      }
    } else {
      for(i = 0; i < n; ++i) {
        charges[i] = charge;
      }
    }
    return force.resume();
  };
  force.resume = function() {
    return force.alpha(.1);
  };
  force.stop = function() {
    return force.alpha(0);
  };
  force.drag = function() {
    if(!drag) drag = d3.behavior.drag().origin(d3_identity).on("dragstart", d3_layout_forceDragstart).on("drag", dragmove).on("dragend", d3_layout_forceDragend);
    this.on("mouseover.force", d3_layout_forceMouseover).on("mouseout.force", d3_layout_forceMouseout).call(drag);
  };
  return d3.rebind(force, event, "on");
};