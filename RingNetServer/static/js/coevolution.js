var width = 960,
	height = 600;
var margin = {
	"left": 10,
	"top": 10,
	"right": 10,
	"bottom": 10,
	"hgap": 30,
	"vgap": 10
}; // [left, top, right, bottom]
var bar = {
	"width": 30,
	"height": 12,
	"vgap": 20,
	"hgap": 1
};
var color = d3.scale.category10();
var _data = []
d3.layout.coevol = function() {

	var coevol = {};
	var _size = [1, 1],
		_timespan = [2000, 2009],
		_focus = [],
		_categories = [],
		_time = 2005,
		_authors = []; // raw data
	var _dots = []; //svg elements
	var timeidx = {};
	var svg = {};

	function timeline(x1, x2, y, ftime) {
		var cx = (x2 + x1) / 2.0;
		return "M " + x1 + " " + y + " H " + (cx - 8) + " A 8 8 0 0 1 " + cx + " " + (y + 8) + " A 8 8 0 0 1 " + (cx + 8) + " " + y + " H " + x2 + " M " + cx + " " + (y + 8) + " V " + (y + bar.vgap * 2);
	}

	function guideline(f, d, off_x, off_y, flag) {

		var w = f.height * 0.9 * d.rank * d.rank,
			hw = w / 2.0;
		var my = f.cy + 10;

		var dcx = off_x + d.cx;
		var dcy = off_y + d.cy;

		var path = "";
		if (dcx > f.cx) {
			path = "M " + f.cx + " " + (f.cy - hw) + " L " + (dcx - hw) + " " + (f.cy - hw) + " A " + w + " " + w + " 0 0 1 " + (dcx + hw) + " " + (f.cy + hw) + " L " + (dcx + hw) + " " + my;

			path += flag ? (" L " + dcx + " " + dcy + " L " + (dcx - hw) + " " + my) : (" L " + (dcx - hw) + " " + my);

			path += " L " + (dcx - hw) + " " + (f.cy + hw) + " L " + f.cx + " " + (f.cy + hw) + " L " + f.cx + " " + (f.cy - hw);
		} else {
			path = "M " + f.cx + " " + (f.cy - hw) + " L " + (dcx + hw) + " " + (f.cy - hw) + " A " + w + " " + w + " 0 0 0 " + (dcx - hw) + " " + (f.cy + hw) + " L " + (dcx - hw) + " " + my;

			path += flag ? (" L " + dcx + " " + dcy + " L " + (dcx + hw) + " " + my) : (" L " + (dcx + hw) + " " + my);

			path += " L " + (dcx + hw) + " " + (f.cy + hw) + " L " + f.cx + " " + (f.cy + hw) + " L " + f.cx + " " + (f.cy - hw);
		}
		return path;
	}

	function curve(r) {

		var radii = Math.abs(r.source.cx - r.target.cx) / 2.0;

		if (r.source.cx > r.target.cx) {
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
		if (!_focus) return;
		for (var i = 0; i < _focus.length; ++i) {
			for (var j = 0; j < _focus[i].trace.length; ++j) {
				_focus[i].trace[j].owner = _focus[i];
				_focus[i].trace[j].idx = j;
			}
			_focus[i].id = i;
		}
		return coevol;
	}

	coevol.layout = function() {

		if (!_focus || !_categories) {
			throw "data is empty";
		}

		timeidx = d3.scale.linear().domain(_timespan).range([0, _timespan[1] - _timespan[0]]);

		var focus_area_height = 2 * _focus.length * bar.vgap;

		var y = d3.scale.linear()
			.domain([0, _focus.length * 2])
			.range([margin.top + bar.height / 2.0, margin.top + focus_area_height]);

		var gap = 0.05 * (_size[0] - margin.left - margin.right) / (_categories.length - 1);

		var hh = _categories[0].bCollapsed ? bar.height : ((_size[1] - margin.bottom) - (focus_area_height + margin.top + margin.vgap)) * 2 / 3;

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
				if (typeof r.source == "number") r.source = c.items[r.source];
				if (typeof r.target == "number") r.target = c.items[r.target];
			})

			left += section + gap;
		});

		var idx = Math.round(timeidx(_time));

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

			var pcx = f.trace[idx].cx,
				phw = 10;
			for (var j = idx - 1; j >= 0; --j) {
				f.trace[j].cx = pcx - phw - f.trace[j].width / 2.0 - bar.hgap;
				f.trace[j].cy = y(2 * i);
				pcx = f.trace[j].cx;
				phw = f.trace[j].width / 2.0;
			}

			pcx = f.trace[idx].cx;
			phw = 10;
			for (var j = idx + 1; j < f.trace.length; ++j) {
				f.trace[j].cx = pcx + phw + f.trace[j].width / 2.0 + bar.hgap;
				f.trace[j].cy = y(2 * i);
				pcx = f.trace[j].cx;
				phw = f.trace[j].width / 2.0;
			}

			for (var j = 0; j < f.categories.length; ++j) {
				axis.domain([0, f.categories[j][idx].length - 1]);
				f.categories[j][idx].forEach(function(item, k) {
					item.cx = axis(k);
					item.cy = value(item.rank);
					item.r = 5 + 20 * item.size;
				});
			}
		});

		return coevol;
	};

	coevol.init = function() {

		if (!_categories) return;

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

		for (i = 0; i < _categories.length; ++i) {
			_categories[i].bCollapsed = false;
		}

		return coevol;
	}

	coevol.render = function() {

		if (!_focus || !_categories) {
			throw "data is empty";
		}
		var div = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

		svg.selectAll("g.category").remove();
		var category = svg.selectAll("g.category")
			.data(_categories)
			.enter().append("g")
			.attr("id", function(d, i) {
			return "c-" + i;
		})
			.attr("class", "category")
			.attr("transform", function(c) {
			return "translate(" + c.x + "," + c.y + ")"
		})
			.on("dblclick", function(p) {
			coevol.collapse();
		});

		category.append("rect")
			.attr("width", function(c) {
			return c.width;
		})
			.attr("height", function(c) {
			return c.height;
		});
		category.append("text")
			.text(function(d) {
			return d.name;
		})
			.attr("class", "label");

		svg.append("g")
			.attr("id", "guideline");

		var idx = Math.round(timeidx(_time));

		category.selectAll("line.axis").remove();
		var axis = category.selectAll("line.axis")
			.data(function(c) {
			return c.items;
		})
			.enter().append("line")
			.attr("class", "axis")
			.attr("x1", function(d) {
			return d.cx;
		})
			.attr("y1", function(d) {
			return 0;
		})
			.attr("x2", function(d) {
			return d.cx;
		})
			.attr("y2", function(d) {
			return d.length;
		})
			.on("mouseover", mouseover_event)
		// 	.on("mouseover", function(d) {
		// 	div.transition().duration(10).style("opacity", .9);
		// 	label = "";
		// 	d.labels.forEach(function(l) {
		// 		label += l;
		// 		label += "<br/>";
		// 	})
		// 	div.html(label).style("left", (d3.event.pageX) + "px").style("top", (d3.event.pageY - 28) + "px");
		// })
		// 	.on("mouseout", function(d) {
		// 	div.transition().duration(500).style("opacity", 0);
		// });

		category.selectAll("path.link").remove();
		var rels = category.selectAll("path.link")
			.data(function(c) {
			return c.relations;
		})
			.enter().append("path")
			.attr("d", function(l) {
			return curve(l)
		})
			.attr("class", "link")
			.style("stroke-width", function(d) {
			if(d.wei == 0)
				return 0 +"px";
			return (5 * d.wei[idx]) + "px";
		})
			.style("opacity", function(d) {
			return d.wei[idx];
		});

		svg.selectAll("#timeline").remove();
		var tline = svg.selectAll("#timeline")
			.data(_focus)
			.enter().append("g")
			.attr("id", "timeline");

		tline.append("path")
			.attr("d", function(d) {
			return timeline(margin.left, _size[0] - margin.right, d.y);
		})
			.style("stroke", function(d, i) {
			return color(d.name);
		})
			.attr("marker-end", function(d, i) {
			if (i == _focus.length - 1) return "url(#triangle-end)";
			else return undefined;
		})
			.attr("class", "timeline");

		tline.append("text")
			.text(function(d, i) {
			return d.name;
		})
			.attr("transform", function(d) {
			return "translate(" + margin.left + ", " + d.y + ")"
		})
			.style("class", "label");

		_focus.forEach(function(f, i) {

			console.log(i);

			svg.selectAll("#t_" + f.name).remove();

			var titem = svg.selectAll("#t_" + f.name)
				.data(f.trace)
				.enter().append("g")
				.attr("class", "trace")
				.attr("id", function(d, j) {
				return "t_" + f.name;
			})
				.attr("transform", function(d) {
				return "translate(" + d.cx + "," + d.cy + ")";
			});

			titem.append("rect")
				.attr("fill", function(d) {
				return color(f.name);
			})
				.attr("x", function(d) {
				return -d.width / 2.0;
			})
				.attr("y", function(d) {
				return -d.height / 2.0;
			})
				.attr("width", function(d) {
				return d.width;
			})
				.attr("height", function(d) {
				return d.height;
			})
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
				.text(function(d, j) {
				return (j == idx && i == _focus.length - 1) ? _time : "";
			});

			for (var j = 0; j < f.categories.length; ++j) {
				_data = [];
				for (var k = 0; k < f.categories[j][idx].length; ++k) {
					if (k > 0) {
						_d = {}
						_d.pre = f.categories[j][idx][k - 1];
						_d.cur = f.categories[j][idx][k];
						_data.push(_d)
					}

				}
				d3.select("#c-" + j).selectAll("#l-" + i + "-" + j).remove();

				d3.select("#c-" + j)
					.selectAll("#l-" + i + "-" + j)
					.data(_data)
					.enter().append("line")
					.attr("class", "person")
					.attr("x1", function(d) {
					return d.pre.cx;
				})
					.attr("x2", function(d) {
					return d.cur.cx;
				})
					.attr("y1", function(d) {
					return d.pre.cy;
				})
					.attr("y2", function(d) {
					return d.cur.cy;
				})
					.attr("stroke-width", "1px")
					.attr("stroke", function(d) {
					return color(f.name);
				}).attr("id", function(d) {
					return "l-" + i + "-" + j;
				})

				d3.select("#c-" + j).selectAll("#d-" + i + "-" + j).remove();

				d3.select("#c-" + j)
					.selectAll("#d-" + i + "-" + j)
					.data(f.categories[j][idx])
					.enter().append("rect")
					.attr("id", function(d) {
					return "d-" + i + "-" + j;
				})
					.attr("class", "dot")
					.attr("x", function(d) {
					return d.cx - d.r / 2.0;
				})
					.attr("y", function(d) {
					return d.cy - bar.height / 2.0;
				})
					.attr("width", function(d) {
					return d.r;
				})
					.attr("height", bar.height/2)
					.style("fill", function(d) {
					return color(f.name);
				})
				// .on("mouseover", function(d){
				// 	div.transition().duration(200).style("opacity",.9);
				// 	div.html("haha").style("left",(d3.event.pageX)+"px").style("top",(d3.event.pageY-28)+"px");
				// })
				// .on("mouseout", function(d){
				// 	div.transition().duration(500).style("opacity",0);
				// });
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

	coevol.categories = function(x) {
		if (!arguments.length) return _categories;
		_categories = x;

		return coevol;
	};

	coevol.timespan = function(x) {
		if (!arguments.length) return _timespan;
		_timespan = x;
		_time = Math.round((x[0] + x[1]) / 2);
		return coevol;
	};

	coevol.size = function(x) {
		if (!arguments.length) return _size;
		_size = x;
		return coevol;
	};

	coevol.authors = function(x) {
		if (!arguments.length) return _authors;
		_authors = x;
		return coevol;
	}


	var aid = 0;

	coevol.add = function(x) {
		x = $("#add").val();
		_t = coevol.timespan();
		_a = coevol.authors();
		_q = "";
		if (_a.indexOf(x) >= 0) {
			return;
		}
		for (var i = 0; i < _a.length; i++) {
			_q += _a[i];
			_q += ",";
		}
		_q += x;
		_t[0] = $("#start").val();
		_t[1] = $("#end").val();

		$.get('/ringnet/render/coevo/?' + "start=" + _t[0] + "&end=" + _t[1] + '&authors=' + _q, function(data, textStatus, jqXHR) {
			var json = JSON.parse(data);
			$("#chart").empty()
			_a.push(x)
			coevol.timespan(json.range)
				.focus(json.focus)
				.categories(json.categories)
				.init()
				.index()
				.layout()
				.render();
		}).error(function() {
			alert("author not found!")
		})

	}

	coevol.remove = function(x) {
		x = $("#add").val();
		_t = coevol.timespan();
		_a = coevol.authors();
		_q = "";
		index = _a.indexOf(x);
		if (index < 0) {
			return;
		}
		_a.splice(index, 1);
		_q += _a[0];
		for (var i = 1; i < _a.length; i++) {
			_q += ",";
			_q += _a[i];
		}
		_t[0] = $("#start").val();
		_t[1] = $("#end").val();

		$.get('/ringnet/render/coevo/?' + "start=" + _t[0] + "&end=" + _t[1] + '&authors="' + _q + '"', function(data, textStatus, jqXHR) {
			var json = JSON.parse(data);
			$("#chart").empty()
			coevol.timespan(json.range)
				.focus(json.focus)
				.categories(json.categories)
				.init()
				.index()
				.layout()
				.render();
		}).error(function() {
			alert("author not found!")
		})
	}

	///////////////////////
	// Interaction
	///////////////////////
	coevol.collapse = function() {

		var i = 0;
		for (i = 0; i < _categories.length; ++i) {
			_categories[i].bCollapsed = !_categories[i].bCollapsed;
		}

		var bcollapse = _categories[0].bCollapsed;

		coevol.layout();

		var category = d3.selectAll("g.category");

		category.selectAll("rect")
			.transition()
			.attr("height", function(c) {
			return c.height;
		});

		category.selectAll("line.axis")
			.transition()
			.attr("y2", function(d) {
			return d.length;
		});

		category.selectAll("path.link")
			.transition()
			.attr("d", function(d) {
			return curve(d);
		});

		// d3.select("#c-" + j)
		// 	.selectAll("#l-" + i + "-" + j)
		// 	.data(_data)
		// 	.enter().append("line")
		// 	.attr("class", "person")
		// 	.attr("x1", function(d) {
		// 	return d.pre.cx ;
		// })
		// 	.attr("x2", function(d) {
		// 	return d.cur.cx ;
		// })
		// 	.attr("y1", function(d) {
		// 	return d.pre.cy ;
		// })
		// 	.attr("y2", function(d) {
		// 	return d.cur.cy;
		// })
		// 	.attr("stroke-width", "1px")
		// 	.attr("stroke", function(d) {
		// 	return color(f.name);
		// })
		category.selectAll("line.person")
			.transition()
			.attr("x1", function(d) {
			return d.pre.cx;
		})
			.attr("x2", function(d) {
			return d.cur.cx;
		})
			.attr("y1", function(d) {
			return d.pre.cy;
		})
			.attr("y2", function(d) {
			return d.cur.cy;
		});

		category.selectAll("rect.dot")
			.transition()
			.attr("x", function(d) {
			return d.cx - d.r / 2.0//bcollapse ? d.cx : d.cx - d.r / 2.0
		})
			.attr("y", function(d) {
			return d.cy - bar.height / 2.0;//bcollapse ? d.cy : d.cy - bar.height / 2.0;
		})
			.attr("width", function(d) {
			return bcollapse ? 0 : d.r;
		})
			.attr("height", bar.height/2);//bcollapse ? 0 : bar.height);


		for (var i = 0; i < _focus.length; ++i) {
			for (var j = 0; j < _focus[i].trace.length; ++j) {
				var item = _focus[i].trace[j];
				if (item.pick && item.expand) {
					coevol.highlight(item, false);
					coevol.highlight(item, true);
				}
			}
		}
	}

	coevol.highlight = function(item, bflag) {

		if (!item) return;

		var f = item.owner;

		var tidx = Math.round(timeidx(_time));

		if (item.idx != tidx) return;

		var ps = d3.selectAll("#p_" + f.name + "_" + tidx);

		if (bflag) {

			ps.remove();

			var guidelines = d3.selectAll("#guideline");

			var tag = guidelines.append("g")
				.attr("id", "p_" + f.name + "_" + tidx)
				.attr("class", "link");

			for (var i = 0; i < _categories.length; ++i) {
				f.categories[i][tidx].forEach(function(t) {
					if (t.rank >= 0.5) {
						tag.append("path")
							.style("stroke", color(f.name))
							.style("fill", color(f.name))
							.style("opacity", 0.5)
							.attr("d", guideline(item, t, _categories[i].x, _categories[i].y, _focus.length < 2 || item.expand));
					}
				});
			}

		} else {
			if (!item.pick) ps.remove();
		}
	}

	coevol.showguideline = function(item) {
		if (!item) return;

		var f = item.owner;
		var tidx = Math.round(timeidx(_time));
		if (tidx != item.idx) {
			return;
		}

		item.pick = true;
		item.expand = !item.expand;

		coevol.highlight(item, false);
		coevol.highlight(item, true);
	}

	coevol.pick = function(item) {

		if (!item) return;

		var tidx = Math.round(timeidx(_time));

		if (tidx == item.idx) {
			item.pick = !item.pick;
		} else {
			_time = _timespan[0] + item.idx;

			tidx = Math.round(timeidx(_time));

			coevol.layout();

			var i = 0,
				j = 0;
			for (i = 0; i < _focus.length; ++i) {
				for (j = 0; j < _focus[i].trace.length; ++j) {
					if (_focus[i].trace[j].pick) {
						_focus[i].trace[j].pick = false;
						_focus[i].trace[j].expand = false;
						var ps = d3.selectAll("#p_" + _focus[i].name + "_" + j);
						ps.remove();
					}
				}

				d3.selectAll("#t_" + _focus[i].name)
					.transition()
					.attr("transform", function(d) {
					return "translate(" + d.cx + "," + d.cy + ")";
				})
					.selectAll("text")
					.text(function(d, j) {
					return (d.idx == tidx ) ? _time : "";
				});

				var c = d3.selectAll("g.category");
				for (var j = 0; j < _categories.length; ++j) {
					_data = []
					for (var k = 0; k < _focus[i].categories[j][tidx].length; ++k) {
						if (k > 0) {
							_d = {}
							_d.pre = _focus[i].categories[j][tidx][k - 1];
							_d.cur = _focus[i].categories[j][tidx][k];
							_data.push(_d)
						}

					}

					c.selectAll("#l-" + _focus[i].id + "-" + j)
						.data(_data)
						.transition()
						.attr("x1", function(d) {
						return d.pre.cx;
					})
						.attr("x2", function(d) {
						return d.cur.cx;
					})
						.attr("y1", function(d) {
						return d.pre.cy;
					})
						.attr("y2", function(d) {
						return d.cur.cy;
					})

					c.selectAll("#d-" + _focus[i].id + "-" + j)
						.data(_focus[i].categories[j][tidx]);

					d3.selectAll("#d-" + _focus[i].id + "-" + j)
						.transition()
						.attr("x", function(d) {
						return d.cx - d.r / 2.0;
					})
						.attr("y", function(d) {
						return d.cy - bar.height / 2.0;
					})
						.attr("width", function(d) {
						return d.r;
					});
				}


				c.selectAll("path.link")
					.transition()
					.attr("d", function(l) {
					return curve(l)
				})
					.style("stroke-width", function(d) {
					if(d.wei[tidx] == 0)
						return 0 + "px";
					return (5 * d.wei[tidx]) + "px";
				})
					.style("opacity", function(d) {
					return d.wei[tidx];
				});
			}
		}
	}

	var mouseover_event = function(d) {
		var tagcloud = {};
		var words = [];
		if (d.labels.length > 0){
			var wfreq = [];
			for (var i=0; i<d.labels.length; i++){
			  	var obj = {};
			  	obj.text = d.labels[i];
			  	obj.size = 10 - i;
			  	obj.color = color(i);
			  	words.push(obj);
			  	
			  	var wf = {tag: d.labels[i].tag, freq: d.labels[i].n};
			  	wfreq.push(wf);
			}
			
			var sortfreq = wfreq.sort(function(a, b){return b.freq - a.freq;});
			var string = sortfreq[0].tag;
			var size = sortfreq.length < 10 ? sortfreq.length : 10;
			for (var i=1; i<size; i++){
				string += (","+sortfreq[i].tag);
			}
			
			//req_tweets('content', string);
		}
		
		tagcloud.words = words;

		generate_tagcloud(tagcloud, d.x+d.width/2, d.y_c-d.height_c/2, d.time);
		d3.select("#tagcloud").style("opacity", 1).style("visibility", "visible");
		// if (flag_cloud == 0){
		// 	if (flag_view == 0){
		// 		if (d.x < width/2){
					
		// 		}else{
		// 			generate_tagcloud(tagcloud, d.x-tagwidth-d.width/2, d.y_c-d.height_c/2, d.time);
		// 		}
		// 	}else {
		// 		if (d.x < width/2){
		// 			generate_tagcloud(tagcloud, d.x+d.width/2, d.y_s-d.height_s/2, d.time);
		// 		}else{
		// 			generate_tagcloud(tagcloud, d.x-tagwidth-d.width/2, d.y_s-d.height_s/2, d.time);
		// 		}
		// 	}
			
			
			
			
		// 	flag_cloud2 = 1;
		// }
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

//});

function queryString() {
	var result = {}, queryString = location.search.slice(1),
		re = /([^&=]+)=([^&]*)/g,
		m;

	while (m = re.exec(queryString)) {
		result[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
	}

	return result;
}

function render(x) {
	_t = coevol.timespan();
	_a = coevol.authors();
	_q = "";
	if (_a.indexOf(x) >= 0) {
		return;
	}
	for (var i = 0; i < _a.length; i++) {
		_q += _a[i];
		_q += ",";
	}
	_q += x;

	_t[0] = $("#start").val();
	_t[1] = $("#end").val();

	$.get('/ringnet/render/coevo/?' + "start=" + _t[0] + "&end=" + _t[1] + '&authors=' + _q , function(data, textStatus, jqXHR) {
		var json = JSON.parse(data);
		$("#chart").empty()
		_a.push(x)
		coevol.timespan(json.range)
			.focus(json.focus)
			.categories(json.categories)
			.init()
			.index()
			.layout()
			.render();
	}).error(function() {
		alert("author not found!") 
	})

}
$(function() {
	function log(message) {
		$("<div>").text(message).prependTo("#log");
		$("#log").scrollTop(0);
	}

	$("#add").autocomplete({
		source: function(request, response) {
			$.get("/ringnet/search/?q=" + request.term, function(data) {
				response($.map(JSON.parse(data), function(item) {
					return {
						label: item.title,
						value: item.path
					}
				}));
			});
		},
		minLength: 2,
		select: function(event, ui) {
			// render(ui.item.value);
			// $("#add").val("");
		},
		open: function() {
			$(this).removeClass("ui-corner-all").addClass("ui-corner-top");
		},
		close: function() {
			$(this).removeClass("ui-corner-top").addClass("ui-corner-all");
		}
	});
});


var AjaxRequest = {
	render: function(start, end) {
		var authors = queryString()["authors"];
		if(authors==undefined){
			return;
		}
		var x = [];
		var a = authors.replace("'", "").replace('"', "")
		authors = a.split(',');
		for (var i = 0; i < authors.length; i++) {
			x.push(authors[i]);
		}
		coevol.authors(x);
		$.get('/ringnet/render/coevo/' + '?' + window.location.href.slice(window.location.href.indexOf('?') + 1), function(data, textStatus, jqXHR) {
			var json = JSON.parse(data);
			coevol.timespan(json.range)
				.focus(json.focus)
				.categories(json.categories)
				.init()
				.index()
				.layout()
				.render();
		})
	}
}
$("#start").val(2000);
$("#end").val(2010);
AjaxRequest.render(2000, 2010);