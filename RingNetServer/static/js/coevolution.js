var width = 1024, height = 450;
var margin = {"left":10, "top":10, "right":10, "bottom":10, "hgap":30, "vgap" : 10}; // [left, top, right, bottom]
var bar = {"width":30, "height": 12, "vgap":20, "hgap" : 1};
var color = d3.scale.category10();

d3.layout.coevol = function() {

  var coevol = {};
  var _size = [ 1, 1 ], _timespan = [1, 1], _focus = [], _categories =[], _time = 2011; // raw data
  var _dots = []; //svg elements
  var timeidx = {};
  var svg = {};
  
  function timeline(x1, x2, y, ftime) {
  		var cx = (x2 + x1) / 2.0;
  		return "M " + x1 + " " + y 
  	  		+ " H " + (cx - 8)
  	  		+ " A 8 8 0 0 1 " + cx + " " + (y + 8)  	    
  	  		+ " A 8 8 0 0 1 " + (cx + 8) + " " + y 
  	  		+ " H " + x2
  	  		+ " M " + cx + " " + (y + 8)
  	  		+ " V " + (y + bar.vgap * 2);
  }
  
  function guideline(f, d, off_x, off_y, flag) {
  		
  		var w = f.height * 0.9 * d.rank * d.rank, hw = w / 2.0;
  		var my = f.cy + 10;
  		
  		var dcx = off_x + d.cx;
  		var dcy = off_y + d.cy;
  		
  		var path = "";
  		if(dcx > f.cx) {
	  		path = "M " + f.cx + " " + (f.cy - hw)
	  			+ " L " + (dcx - hw) + " " + (f.cy - hw) 
	  			+ " A " + w + " " + w + " 0 0 1 " + (dcx + hw) + " " + (f.cy + hw)
	  			+ " L " + (dcx + hw) + " " + my;
	  			
	  		path += flag ? (" L " + dcx + " " + dcy + " L " + (dcx - hw) + " " + my) : (" L " + (dcx - hw) + " " + my);
	  			
	  		path += " L " + (dcx - hw) + " " + (f.cy + hw)
	  			+ " L " + f.cx + " " + (f.cy + hw)
	  			+ " L " + f.cx + " " + (f.cy - hw);	  		
  		} else {
	  		path = "M " + f.cx + " " + (f.cy - hw)
  				+ " L " + (dcx + hw) + " " + (f.cy - hw) 
  				+ " A " + w + " " + w + " 0 0 0 " + (dcx - hw) + " " + (f.cy + hw)
  				+ " L " + (dcx - hw) + " " + my;
  				
  			path += flag ? (" L " + dcx + " " + dcy + " L " + (dcx + hw) + " " + my) : (" L " + (dcx + hw) + " " + my);
  				
  			path +=	" L " + (dcx + hw) + " " + (f.cy + hw)
  				+ " L " + f.cx + " " + (f.cy + hw)
  				+ " L " + f.cx + " " + (f.cy - hw);
  		}
  		return path;
  }
  
  function curve(r) {
  	  
  	  var radii = Math.abs(r.source.cx - r.target.cx) / 2.0;
  	  
  	  if(r.source.cx > r.target.cx) {
	  	  var x = r.source.cx;
	  	  var y = r.source.length;
	  	  return "M " + r.target.cx + " " + y + "A " + radii + " " + 0.7 * radii + " 0 0 0 " + r.source.cx + " " + y;  
  	  } else {
	  	  var x = r.target.cx;
	  	  var y = r.source.length;
	  	  return "M " + r.source.cx + " " + y + "A " + radii + " " + 0.7 * radii + " 0 0 0 " + r.target.cx + " " + y;  	  	  
  	  }
  }
        
  coevol.index = function() {
	  if(!_focus) return;
	  for(var i = 0; i < _focus.length; ++i) {
		  for(var j = 0; j < _focus[i].trace.length; ++j) {
			  _focus[i].trace[j].owner = _focus[i];
			  _focus[i].trace[j].idx = j;
		  }
		  _focus[i].id = i;
	  }
	  return coevol;
  }
  
  coevol.layout = function() {
  	    
		if(!_focus || !_categories) {
			throw "data is empty";	
		}
		
		timeidx = d3.scale.linear().domain(_timespan).range([0, _timespan[1] - _timespan[0]]);
		
		var focus_area_height = 2 * _focus.length * bar.vgap;
		
		var y = d3.scale.linear()
			.domain([0, _focus.length * 2])
			.range([margin.top + bar.height / 2.0, margin.top + focus_area_height]);
		
		var gap = 0.05 * (_size[0] - margin.left - margin.right) / (_categories.length - 1);
				
		var hh = _categories[0].bCollapsed ? 
				bar.height : 
				((_size[1] - margin.bottom) - (focus_area_height + margin.top + margin.vgap)) * 2  / 3;
		
		var yy = focus_area_height + margin.top + margin.vgap;
		
		var left = margin.left + _size[0] / 10;
		
		var section = 0.95 * (_size[0] - margin.left - margin.right - 2 * _size[0] / 10) / _categories.length;
		
		var axis = d3.scale.linear().range([5, section - 5]);
		
		var value = d3.scale.linear().domain([1, 0]).range([10, hh - 10]);
								
		_categories.forEach(function(c, i) {
			
			axis.domain([0, c.items.length - 1]);
			
			c.x = left;
			c.y = yy;
			c.width = section;
			c.height = hh;
						
			c.items.forEach(function(a, j) {
				a.cx = axis(j);
				a.length = hh;
			});
			
			c.relations.forEach(function(r, j) {
				if(typeof r.source == "number") r.source = c.items[r.source];
				if(typeof r.target == "number") r.target = c.items[r.target];
			})
					
  			left += section + gap;
		});
		
		var idx = timeidx(_time);
		
		_focus.forEach(function(f, i) {
			
			f.x = _size[0] / 2.0;
			f.y = y(2 * i);
			
			var bw = (_size[0] - margin.left - margin.right) / (f.trace.length + 1);
			
			f.trace.forEach(function(t, j) {
				t.width = t.weight * bw;
				t.height = bar.height;
			});
			
			f.trace[idx].cx = _size[0] / 2.0;
			f.trace[idx].cy = y(2 * i + 1); //- 0.7 * bar.height;
			
			var pcx = f.trace[idx].cx, phw = 10;
			for(var j = idx - 1; j >= 0; --j) {
				f.trace[j].cx = pcx - phw - f.trace[j].width / 2.0 - bar.hgap;
				f.trace[j].cy = y(2 * i);
				pcx = f.trace[j].cx;
				phw = f.trace[j].width / 2.0;
			}
			
			pcx = f.trace[idx].cx;
			phw = 10;
			for(var j = idx + 1; j < f.trace.length; ++j) {
				f.trace[j].cx = pcx + phw + f.trace[j].width / 2.0 + bar.hgap;
				f.trace[j].cy = y(2 * i);
				pcx = f.trace[j].cx;
				phw = f.trace[j].width / 2.0;
			}
			
			for(var j = 0; j < f.categories.length; ++j) {
				axis.domain([0, f.categories[j][idx].length - 1]);
				f.categories[j][idx].forEach(function(item, k) {
					item.cx = axis(k);
					item.cy = value(Math.random()); //value(item.rank);
					item.r = 5 + 20 * Math.random(); //item.size;
				});
			}
		});
		
  	  	return coevol;
  };
  
  coevol.init = function() {
  
  		if(!_categories) return;
		
		svg = d3.select("#chart").append("svg")
			.attr("width", width)
			.attr("height", height);
		
		var defs = svg.append("defs");
		defs.append("marker")
			.attr("id", "triangle-start")
			.attr("viewBox", "0 0 10 10")
			.attr("refX", 10)
			.attr("refY", 5)
			.attr("markerWidth", -6)
			.attr("markerHeight", 6)
			.attr("orient", "auto")
			.append("path")
			.attr("d", "M 0 0 L 10 5 L 0 10 z");
					
		defs.append("marker")
			.attr("id", "triangle-end")
			.attr("viewBox", "0 0 10 10")
			.attr("refX", 10)
			.attr("refY", 5)
			.attr("markerWidth", 6)
			.attr("markerHeight", 6)
			.attr("orient", "auto")
			.append("path")
			.attr("d", "M 0 0 L 10 5 L 0 10 z");
			
		for(i = 0; i < _categories.length; ++i) {	
	    	_categories[i].bCollapsed = false;
	    }	
				
		return coevol;
  }
  
  coevol.render = function() {
	  
    	if(!_focus || !_categories) {
  			throw "data is empty";
		}
		
		svg.selectAll("g.category").remove();
		var category = svg.selectAll("g.category")
			.data(_categories)
			.enter().append("g")
			.attr("id", function(d, i){return "c-" + i;})
			.attr("class", "category")
			.attr("transform", function(c){return "translate(" + c.x + "," + c.y + ")"})
			.on("dblclick", function(p) {coevol.collapse();});
			
		category.append("rect")
			.attr("width", function(c) {return c.width;})
			.attr("height", function(c) {return c.height;});
		category.append("text")
			.text(function(d){return d.name;})
			.attr("class", "label");
			
		svg.append("g")
			.attr("id", "guideline");
		
		var idx = timeidx(_time);
		
		category.selectAll("line.axis").remove();
		var axis = category.selectAll("line.axis")
			.data(function(c){return c.items;})
			.enter().append("line")
			.attr("class", "axis")
			.attr("x1", function(d) {return d.cx;})
			.attr("y1", function(d) {return 0;})
			.attr("x2", function(d) {return d.cx;})
			.attr("y2", function(d) {return d.length;});
		
		category.selectAll("path.link").remove();
		var rels = category.selectAll("path.link")
			.data(function(c){return c.relations;})
			.enter().append("path")
			.attr("d", function(l) {return curve(l)})
			.attr("class", "link")
			.style("stroke-width", function(d){return (5 * d.wei[idx]) + "px";})
			.style("opacity", function(d){return d.wei[idx];});
		
		svg.selectAll("#timeline").remove();
		var tline = svg.selectAll("#timeline")
  			.data(_focus)
  			.enter().append("g")
  			.attr("id", "timeline");
  			
  			tline.append("path")
  			.attr("d", function(d){return timeline(margin.left, _size[0] - margin.right, d.y);})
  			.style("stroke", function(d, i){return color(d.name);})
  			.attr("marker-end", function(d, i){if(i == _focus.length - 1) return "url(#triangle-end)"; else return undefined;})
  			.attr("class", "timeline");
  			
  			tline.append("text")
  				.text(function(d, i){return d.name;})
  				.attr("transform", function(d) {return "translate(" + margin.left + ", " + d.y + ")"})
  				.style("class", "label");
  			
		_focus.forEach(function(f, i) {
  			
  			console.log(i);
  			
  			svg.selectAll("#t_" + f.name).remove();
  			
			var titem = svg.selectAll("#t_" + f.name)
			.data(f.trace)
			.enter().append("g")
			.attr("class", "trace")
			.attr("id", function(d, j) {return "t_" + f.name;})
			.attr("transform", function(d) {return "translate(" + d.cx + "," + d.cy + ")";});
			
			titem.append("rect")
			.attr("fill", function(d) {return color(f.name);})
			.attr("x", function(d){return - d.width / 2.0;})
			.attr("y", function(d){return - d.height / 2.0;})
			.attr("width", function(d){return d.width;})
			.attr("height", function(d){return d.height;})
			.on("mouseover", _mouseover)
			.on("mouseout", _mouseout)
			.on("click", _mousedown)
			.on("dblclick", _dbclick);
			
			titem.append("text")
			.attr("dy", "2em")
			.style("text-anchor", "middle")
			.style("stroke", "#fff")
			.style("opacity", 1.0)
			.style("stroke-width", ".1px")
			.text(function(d, j){return (j == idx && i == _focus.length - 1) ? _time : "";});
			
			for(var j = 0; j < f.categories.length; ++j) {
				
				d3.select("#c-" + j).selectAll("#d-" + i + "-" + j).remove();
				
				d3.select("#c-" + j)
				.selectAll("#d-" + i + "-" + j)
				.data(f.categories[j][idx])
				.enter().append("rect")
				.attr("id", function(d) { return "d-" + i + "-" + j; })
				.attr("class", "dot")
				.attr("x", function(d){return d.cx - d.r / 2.0;})
				.attr("y", function(d){return d.cy - bar.height / 2.0;})
				.attr("width", function(d){return d.r;})
				.attr("height", bar.height)
				.style("fill", function(d){return color(f.name);});
			}
		});			
		return coevol;
  }
  
  ////////////////////////////
  // Data
  ////////////////////////////
  coevol.focus = function(x) {
  	  if (!arguments.length) return _focus;
  	  _focus = x;
	  
	  return coevol;
  };
  
  coevol.categories = function(x){
	  if (!arguments.length) return _categories;
	  _categories = x;
	  
	  return coevol;
  };
  
  coevol.timespan = function(x) {
	  if(!arguments.length) return _timespan;
	  _timespan = x;
	  return coevol;
  };
    
  coevol.size = function(x) {
      if (!arguments.length) return _size;
      _size = x;
      return coevol;
  };
  
  var aid = 0;
  
  coevol.add = function(x) {
  		
  	  var test = {
		"name":"Peter",
		"categories":[
			[
				[
					{"size":0.3, "rank":0.5},
					{"size":0.2, "rank":0.2},
					{"size":0.7, "rank":0.1},
					{"size":0.6, "rank":0.3},
					{"size":0.5, "rank":0.7}
				],
				[
					{"size":0.5, "rank":0.2},
					{"size":0.1, "rank":0.3},
					{"size":0.1, "rank":0.7},
					{"size":0.7, "rank":0.2},
					{"size":0.6, "rank":0.1}
				],
				[
					{"size":0.5, "rank":0.1},
					{"size":0.9, "rank":0.3},
					{"size":0.8, "rank":0.9},
					{"size":0.1, "rank":0.4},
					{"size":0.2, "rank":0.8}
				]
			],
			[
				[
					{"size":0.3, "rank":0.5},
					{"size":0.2, "rank":0.2},
					{"size":0.7, "rank":0.1},
					{"size":0.6, "rank":0.3},
					{"size":0.5, "rank":0.7}
				],
				[
					{"size":0.3, "rank":0.5},
					{"size":0.1, "rank":0.3},
					{"size":0.1, "rank":0.7},
					{"size":0.3, "rank":0.2},
					{"size":0.6, "rank":0.1}
				],
				[
					{"size":0.5, "rank":0.1},
					{"size":0.9, "rank":0.3},
					{"size":0.8, "rank":0.9},
					{"size":0.1, "rank":0.4},
					{"size":0.2, "rank":0.8}
				]
			],
			[
				[
					{"size":0.3, "rank":0.5},
					{"size":0.2, "rank":0.2},
					{"size":0.7, "rank":0.1},
					{"size":0.6, "rank":0.3},
					{"size":0.5, "rank":0.7}
				],
				[
					{"size":0.3, "rank":0.5},
					{"size":0.1, "rank":0.3},
					{"size":0.1, "rank":0.7},
					{"size":0.3, "rank":0.2},
					{"size":0.6, "rank":0.1}
				],
				[
					{"size":0.5, "rank":0.1},
					{"size":0.9, "rank":0.3},
					{"size":0.8, "rank":0.9},
					{"size":0.1, "rank":0.4},
					{"size":0.2, "rank":0.8}
				]
			]
		],
		"trace":[
			{"weight":0.5}, 
			{"weight":0.3},
			{"weight":0.7}
		]
	};
	
		test.name = 'author-' + aid;
		aid++;

	  _focus.push(test);
	  coevol.index().layout().render();
  }
  
  coevol.remove = function(x) {
	  _focus.splice(_focus.indexOf(x), 1);
	  coevol.index().layout().render();
  }
  
  ///////////////////////
  // Interaction
  ///////////////////////
  coevol.collapse = function() {
	  
	  var i = 0;
	  for(i = 0; i < _categories.length; ++i) {	
	      _categories[i].bCollapsed = !_categories[i].bCollapsed;  
	  }
	  
	  var bcollapse = _categories[0].bCollapsed;
	  
	  coevol.layout();
	  
	  var category = d3.selectAll("g.category");
	  
	  category.selectAll("rect")
	  	.transition()
	  	.attr("height", function(c) {return c.height;});
	  
	  category.selectAll("line.axis")
	  	.transition()
		.attr("y2", function(d) {return d.length;});
		
	  category.selectAll("path.link")
	  	.transition()
		.attr("d", function(d) {return curve(d);});
	  
	  category.selectAll("rect.dot")
	  	.transition()
	  	.attr("x", function(d){return bcollapse ? d.cx : d.cx - d.r / 2.0})
	  	.attr("y", function(d){return bcollapse ? d.cy : d.cy - bar.height / 2.0;})
	  	.attr("width", function(d){return bcollapse ? 0 : d.r;})
	  	.attr("height", bcollapse ? 0 : bar.height);
	  
	  for( var i = 0; i < _focus.length; ++i) {
	  	for(var j = 0; j < _focus[i].trace.length; ++j) {
	  		var item = _focus[i].trace[j];
		  	if(item.pick && item.expand) {
			  	coevol.highlight(item, false);
			  	coevol.highlight(item, true);
		  	}
	  	}
	  }		
  }
  
  coevol.highlight = function(item, bflag) {
	  
	  if(!item) return;
	  	  
	  var f = item.owner;
	  
	  var tidx = timeidx(_time);
	  
	  if(item.idx != tidx) return;
	  
	  var ps = d3.selectAll("#p_" + f.name + "_" + tidx);
	  
	  if(bflag) {
	  		
	  	  ps.remove();
	  	  
	  	  var guidelines = d3.selectAll("#guideline");
	  	  
		  var tag = guidelines.append("g")
		  	.attr("id", "p_" + f.name + "_" + tidx)
		  	.attr("class", "link");
		  
		  for(var i = 0; i < _categories.length; ++i) {
		  	  f.categories[i][tidx].forEach(function(t) {
			  		if(t.rank >= 0.5) {
				  		tag.append("path")
				  		.style("stroke", color(f.name))
				  		.style("fill", color(f.name))
				  		.style("opacity", 0.5)
				  		.attr("d", guideline(item, t, _categories[i].x, _categories[i].y, _focus.length < 2 || item.expand));
				  	}
			  });  
		  }
		  
	  } else {
		  if(!item.pick) ps.remove();
	  }
  }
  
  coevol.showguideline = function(item) {
	  if(!item) return;
  	  
  	  var f = item.owner;
  	  var tidx = timeidx(_time);
  	  if(tidx != item.idx) {
  	  	return;
  	  }
  	  
  	  item.pick = true;
  	  item.expand = !item.expand;
  	  
  	  coevol.highlight(item, false);
  	  coevol.highlight(item, true);  
  }
  
  coevol.pick = function(item) {
  	  
  	  if(!item) return;
  	  
  	  var tidx = timeidx(_time);
	  
	  if(tidx == item.idx) {
		  item.pick = !item.pick;
	  } else {
	  	  _time = _timespan[0] + item.idx;
	  	  
	  	  tidx = timeidx(_time);
	  	  
	  	  coevol.layout();
	  	  
	  	  var i = 0, j = 0;
	  	  for(i = 0; i < _focus.length; ++i) {
		  	  for(j = 0; j < _focus[i].trace.length; ++j) {
			  	  if(_focus[i].trace[j].pick) {
				  	  _focus[i].trace[j].pick = false;
				  	  _focus[i].trace[j].expand = false;
				  	  var ps = d3.selectAll("#p_" + _focus[i].name + "_" + j);
				  	  ps.remove();
			  	  }
		  	  }
		  	  
		  	  d3.selectAll("#t_" + _focus[i].name)
		  	  .transition()
		  	  .attr("transform", function(d) {return "translate(" + d.cx + "," + d.cy + ")";})
		  	  .selectAll("text")
		  	  .text(function(d, j){return (d.idx == tidx && i == _focus.length - 1) ? _time : "";});
			
			  var c = d3.selectAll("g.category");
		  	  for(var j = 0; j < _categories.length; ++j) {
				   c.selectAll("#d-" + _focus[i].id + "-" + j)
				   	.data(_focus[i].categories[j][tidx]);
				   
				   d3.selectAll("#d-" + _focus[i].id + "-" + j)
				  	.transition()
				  	.attr("x", function(d){return d.cx - d.r / 2.0;})
				    .attr("y", function(d){return d.cy - bar.height / 2.0;})
				    .attr("width", function(d){return d.r;});
		  	  }
		  	  		
		  	  c.selectAll("path.link")
		  	  .transition()
		  	  .attr("d", function(l) {return curve(l)})
		  	  .style("stroke-width", function(d){return (5 * d.wei[tidx]) + "px";})
		  	  .style("opacity", function(d){return d.wei[tidx];});
	  	  }
	 }
  }
  
  _mouseover = function(f) {
  		coevol.highlight(f, true);
  }
  
  _mouseout = function(f) {
  		coevol.highlight(f, false);
  }
  
  _mousedown = function(f, e) {
	  	coevol.pick(f);
  }
  
  _dbclick = function(f) {
  		coevol.showguideline(f);
  }
  
  return coevol;
};

var coevol = d3.layout.coevol().size([width, height]);

//d3.json("resultv7.json", function(json) {
  coevol
  	  .timespan(json.range)
      .focus(json.focus)
	  .categories(json.categories)
	  .init()
	  .index()
	  .layout()
	  .render();
//});