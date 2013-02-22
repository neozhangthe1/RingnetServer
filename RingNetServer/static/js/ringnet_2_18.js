var AjaxRequest = {
	render: function(context,jconf,start,end){
	    $.get('render/'+context+'?'+"jconf="+jconf+"&start="+start+"&end="+end+"&authors=10",function(data,textStatus,jqXHR){//window.location.href.slice(window.location.href.indexOf('?') + 1),function(data,textStatus,jqXHR){
	    	json.topic = JSON.parse(data);
			ringnet.community(json.community)
		    ringnet.topic(json.topic);
		    ringnet.similarity(json.similarity);

		    ringnet.init();
		    ringnet.community
		    .initPosition()
			.index()
		    //.layout()
			//.reorderAnchorLayout()
		    ringnet.topic
		    .initPosition()
		    .index()
			 .layout()

		 	//ringnet.community
			// .modifyAnchors()
		 	ringnet.topic
			.modifyAnchors()
		    ringnet.initDisplay();
	    })
	}
	// get_jconf_topic: function(jconf){
	//     $.get('topic/'+'?'+"jconf="+jconf,function(data,textStatus,jqXHR){
	//     	selected_topics = JSON.parse(data);
	//     	start = $("#input-start").val();
	//     	end = $("#input-end").val();
	//     })
	// }
}

$("#jconf-select").change(function(){
	jconf = $(this).children(":selected").attr("value");
	AjaxRequest.render("topic", jconf, start, end);
})

var ret
var secletedTrajectory
d3.layout.ringnet = function(){
    ringnet = {}
    community = {}
    topic = {}
    similarity = {}
    circle = {}
    para = []

	ringnet.tol = 1E-5;	
    ringnet.DEFAULT_SPRING_COEFF = 6E-9;
    ringnet.DEFAULT_SPRING_LENGTH = 0


	ringnet.dist = function(a,b){
		  return Math.sqrt((a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y));
	   }
    ringnet.lineDotDist = function(a,b,c){
	   var ab={} , ac={};
	   ab.x = b.x - a.x
		  ab.y = b.y -a.y
		  ac.x = c.x - a.x
		  ac.y = c.y -a.y
		  return Math.abs(ab.x*ac.y-ab.y*ac.x)/ringnet.dist(a,b);
    }

    ringnet.similarity = function(x){
	   if (!arguments.length) return similarity;
	   similarity = x;
	   return ringnet;
    }

    ringnet.community = function(x){

	   if (arguments.length){
		  community = x;
		  return ringnet;
	   }

	   community.primary = false;
	   community.mapping = [];
	   community.anchorNodes = [];
	   community.polylines = [];
	   var mapping = community.mapping;
	   var anchorNodes = community.anchorNodes;
	   var anchors = community.anchors;
	   var items = community.items;
	   var trajectories = community.trajectories;
	   var links = community.links;
	   var meta = community.meta;
	   var bestMapping = [];
	   var polylines = community.polylines;


	   community.init = function(){
		  var k = 0;
		  for(a in anchors){
			 k++;
		  }
		  community.n = k;
		  //console.log(k);
		  var i
			 for (i = 0;i<k;i++){
				mapping.push(i);
			 }
		  community.r = 0.93;
		  return community;
	   }
	   community.initPosition = function(){
		  var i = 0
			 for (a in anchors){
				for (b in anchors[a]){
				    anchorNodes[i] = {}
				    anchorNodes[i].fixed = true;
				    anchorNodes[i].name = "comAnchor "+a.toString() +" "+anchors[a][b].year.toString();
				    anchorNodes[i].group = a;
				    anchorNodes[i].weight = anchors[a][b].weight;
				    i++;
				}
			 }
		  var n = i;
		  i = 0;
		  var dtheta = 2*Math.PI/n;
		  for (i = 0 ; i < n ; i++){
			 anchorNodes[i].x = circle.x+0.9*circle.r*Math.cos(dtheta*-i);
			 anchorNodes[i].y = circle.y+0.9*circle.r*Math.sin(dtheta*-i);
		  }
		  i = 0;
		  for (a in anchors){
			 anchors[a].theta = dtheta*(meta.num*i+(meta.num+1)/2);
			 i++;
		  }
		  items.forEach(function(i){
			 i.x = circle.x;
			 i.y = circle.y;
			 i.fixed =false;
			 i.showLinks = false;
		  });
		  for ( t in trajectories){
			 trajectories[t].highlight = false;
		  }
		  i=0;
		  for ( t in trajectories){
			 trajectories[t].start = i;
			 for (var j=0; j<trajectories[t].length; j++){
				items[trajectories[t][j]].group = t;
				if(trajectories[t][j+1]!=undefined){
				    polylines[i]={};
				    polylines[i].start = items[trajectories[t][j]];
				    polylines[i].end = items[trajectories[t][j+1]];
				    polylines[i].group = t;
				    polylines[i].highlight = false;
				    i++;
				}
			 }
			 trajectories[t].end = i;
		  }
		  return community;
	   }
	   community.index = function() {

		  links.forEach(function(e){
			 var node1 = anchorNodes[e.source*meta.num+e.offset];
			 //console.log(e.source,e.target,e.offset,e.weight);
			 var node2 = items[e.target];
			 if (node2.neighbors == undefined || node2.neighbors == null){
				node2.neighbors = [];
			 }
			 node2.neighbors.push({"id":e.source,"offset":e.offset,"linkWeight":e.weight});
			 if (node1.neighbors == undefined || node1.neighbors == null){
				node1.neighbors = {};
				node1.neighbors.maxW = 0;
			 }
			 if(e.weight > node1.neighbors.maxW)
			 node1.neighbors.maxW = e.weight;
		  });
		  return community;
	   }
	   community.layout = function() {
		  //document.write("===============<br>");
		  if (links.length == 0 || anchorNodes.length < 3){
			 console.log("need more links or anchors");
			 return;
		  }
		  var epsilon = 0.1;
		  var changed = true;
		  while (changed){
			 changed = false;
			 //document.write("------------<br>");
			 items.forEach(function(i){
				var X = circle.x*circle.w;
				var Y = circle.y*circle.w;
				var sw = circle.w;
				var w;
				if(i.neighbors != undefined&&i.neighbors!=null){
				    i.neighbors.forEach(function(n){
					   w = n.linkWeight;
					   var k = mapping[n.id]*meta.num+n.offset;
					   X += anchorNodes[k].x*w;
					   Y += anchorNodes[k].y*w;
					   sw += w ;
				    });

				    //		document.write(i.name," ",i.year," ",X," ",Y," ",sw," ",i.x," ",i.y,"<br>");
				    if (Math.abs(X-i.x*sw)>epsilon||Math.abs(Y-i.y*sw)>epsilon){
					   i.x = X/sw;
					   i.y = Y/sw;
					   changed = true;
				    }
				}
				else{
				    console.log("warning: no neighbor");
				}
			 });
		  }
		  return community;
	   }
	   community.showitems = function(){
		  items.forEach(function(i){
			 console.log(i.x,i.y);
		  });
		  return community;
	   }
	   community.reorderAnchorLayout = function(){
		  console.log("<re>");
		  var n = mapping.length;
		  var Temperature = 280;
		  var loops = n;
		  var rounds = 0;
		  var lastValue
			 var curValue = -1;
		  var bestValue = 0;
		  var xx,yy,sx,sy;
		  var k,v;
		  var epsilon = 0.1

			 while (true){
				rounds++;
				lastValue = curValue;
				k = loops;
				while (k--){
				    var xx = Math.floor(Math.random()*n);
				    if (xx==n)xx = n-1;
				    var yy = Math.floor(Math.random()*(n-2))+1;

				    yy = (xx+yy)%n;
				    mapping[xx] = mapping[xx] + mapping[yy];
				    mapping[yy] = mapping[xx] - mapping[yy];
				    mapping[xx] = mapping[xx] - mapping[yy];
				    community.layout();
				    var v = community.overlapEval();
				    //						console.log(v);
				    if (v>=curValue){
					   curValue = v;
					   //							console.log("new ",v);
					   if (v>bestValue){
						  bestValue = v;
						  for(e in mapping)
							 bestMapping[e] = mapping[e]
					   }
				    }
				    else if ( Math.exp( (v-curValue)/Temperature) > Math.random()){
					   curValue = v;
				    }
				    else{
					   mapping[xx] = mapping[xx] + mapping[yy];
					   mapping[yy] = mapping[xx] - mapping[yy];
					   mapping[xx] = mapping[xx] - mapping[yy];

				    }
				}
				console.log(lastValue,curValue);
				if (Math.abs(lastValue - curValue )<epsilon){
				    break;
				}
				Temperature *= 0.92
			 }

		  mapping = bestMapping
			 console.log("best",bestValue)


			 console.log("</re>");
		  return community;
	   }
	   community.modifyAnchors = function(){
		  var i = 0;
		  var n = anchorNodes.length
			 var dtheta = 2 * Math.PI /n;
		  var j = 0;
		  var k;
		  for (a in anchors){
			 k = mapping[j];	
			 //console.log("final mapping",j,k);
			 i = meta.num*k;
			 var t;
			 for (t = 0; t < meta.num ;t ++){

				//console.log(i);
				anchorNodes[i].x = circle.x + community.r * circle.r * Math.cos(dtheta * -i);
				anchorNodes[i].y = circle.y + community.r * circle.r * Math.sin(dtheta * -i);
				i++;
			 }
			 j++
		  }
		  return community;
	   }
	   community.overlapEval = function(){
		  var i,j,n = items.length;
		  var s = 999999999;
		  var t ;
		  var sum=0;
		  var ret=0;
		  for (i = 0 ; i< n; i++){
			 for (j=i+1;j<n;j++){
				t = (items[i].x-items[j].x)*(items[i].x-items[j].x)
				    if (t<1){
					   ret += t;
					   sum++;
				    }
			 }
		  }
		  return ret/sum;
	   }
	   community.getShowedEdges = function(){
		  ret = [];
		  items.forEach(function(i){
			 if(i.showLinks){
				i.neighbors.forEach(function(n){
				    var e = {};
				    e.start = {};
				    e.end = {};
				    e.start.x = i.x
				    e.start.y = i.y
				    var k = mapping[n.id]*meta.num+n.offset;
				e.end.x = anchorNodes[k].x;
				e.end.y = anchorNodes[k].y;
				ret.push(e);
				});
			 }
		  });
		  return ret;
	   }
	   community.updateTrajectory = function(){
		  trajectories.forEach(function(t){

			 for(var i = t.start;i<t.end;i++){
				polylines[i].highlight = t.highlight;
				if(t.highlight){
				}
			 }

		  });
		  return community;
	   }

	   return community;
    };

    ringnet.topic = function(x) {

	   if (arguments.length){
		  topic = x;
		  return ringnet;
	   }

	   topic.primary = true;
	   topic.anchorNodes = [];
	   topic.offset = 0;
	   topic.mapping = []
		  topic.polylines = []
		  var anchors = topic.anchors;
	   var mapping = topic.mapping;
	   var trajectories = topic.trajectories;
	   var links = topic.links
		  var items = topic.items;
	   var meta = topic.meta;
	   var bestMapping = []
		  var anchorNodes = topic.anchorNodes;
	   var polylines = topic.polylines;

	   topic.init = function(x){
		  topic.offset = [];
		  var k = 0;
		  for (a in anchors){
			 k++;
		  }
		  var i;
		  for (i = 0 ; i < k ; i++){
			 mapping.push(i);
		  }
		  topic.r = 0.98;
		  topic.moment = 0;
		  topic.theta = 0;
		  topic.omiga = 0;
		  topic.mass = 1;
		  topic.energy = 0;
		  topic.totalDeltaTheta = 0;
		  return topic;
	   }

	   topic.initPosition = function() {
		  var i = 0
			 for (a in anchors){
				for (b in anchors[a]){
				    anchorNodes[i] = {}
				    anchorNodes[i].fixed = true;
				    name=anchors[a][b].topic.toString()

				    anchorNodes[i].name = name +" "+anchors[a][b].year.toString();
				    anchorNodes[i].group = a;
				    anchorNodes[i].weight = anchors[a][b].weight;
				    i++;
				}

			 }
		  var n = i;
		  i = 0;
		  var dtheta = 2*Math.PI/n;
		  for (i = 0 ; i < n ; i++){
			 anchorNodes[i].x = circle.x+0.9*circle.r*Math.cos(dtheta*-i);
			 anchorNodes[i].y = circle.y+0.9*circle.r*Math.sin(dtheta*-i);
		  }
		  i = 0;
		  for (a in anchors){
			 anchors[a].theta = dtheta*(meta.num*i+(meta.num+1)/2);
			 i++;
		  }
		  items.forEach(function(i){
			 i.x = circle.x;
			 i.y = circle.y;
			 i.fixed =false;
			 i.showLinks = false;
		  });
		  for ( t in trajectories){
			 trajectories[t].highlight = false;
		  }
		  i=0;
		  for (t in trajectories){
			 trajectories[t].start = i;
			 polylines[i] = [];
			 for (var j=0; j<trajectories[t].length; j++){
				items[trajectories[t][j]].group = t;
				polylines[i][j] = items[trajectories[t][j]];
				// if(trajectories[t][j+1]!=undefined){
				//     polylines[i]={};
				//     polylines[i].start = items[trajectories[t][j]];
				//     polylines[i].end = items[trajectories[t][j+1]];
				//     polylines[i].group = t;
				//     polylines[i].highlight = false;
				//     i++;
				// }
			 }
			 i++;
			 trajectories[t].end = i;
		  }
		  return topic;
	   }	
	   topic.index = function() {

		  links.forEach(function(e){
			 var node1 = anchorNodes[e.source*meta.num+e.offset];
			 //console.log(e.source,e.target,e.offset,e.weight);
			 var node2 = items[e.target];
			 if (node2.neighbors == undefined || node2.neighbors == null){
				node2.neighbors = [];
			 }
			 node2.neighbors.push({"id":e.source,"offset":e.offset,"linkWeight":e.weight});
			 if (node1.neighbors == undefined || node1.neighbors == null){
				node1.neighbors = {};
				node1.neighbors.maxW = 0;
			 }
			 if(e.weight > node1.neighbors.maxW)
			 node1.neighbors.maxW = e.weight;
		  });
		  return topic;
	   }
	   topic.layout = function() {
		  //document.write("===============<br>");
		  if (links.length == 0 || anchorNodes.length < 3){
			 console.log("need more links or anchors");
			 return;
		  }
		  var epsilon = 0.1;
		  var changed = true;
		  while (changed){
			 changed = false;
			 //document.write("------------<br>");
			 items.forEach(function(i){
				var X = circle.x*circle.w;
				var Y =	circle.y*circle.w;
				var sw = circle.w;
				var w;
				if(i.neighbors != undefined&&i.neighbors!=null){
				    i.neighbors.forEach(function(n){
					   w = n.linkWeight;
					   var k = mapping[n.id]*meta.num+n.offset;
					   X += anchorNodes[k].x*w;
					   Y += anchorNodes[k].y*w;
					   sw += w ;
				    });
				    if (Math.abs(X-i.x*sw)>epsilon||Math.abs(Y-i.y*sw)>epsilon){
					   i.x = X/sw;
					   i.y = Y/sw;
					   changed = true;
				    }
				}
				else{
				    console.log("warning: no neighbor");
				}
			 });
		  }
		  return topic;
	   }
	   topic.modifyAnchors = function(){
		  var i = 0;
		  var n = anchorNodes.length
			 var dtheta = 2 * Math.PI /n;
		  var j = 0;
		  var k;
		  for (a in anchors){
			 k = mapping[j];	
			 //console.log("final mapping",j,k);
			 i = meta.num*k;
			 var t;
			 for (t = 0; t < meta.num ;t ++){

				//console.log(i);
				anchorNodes[i].x = circle.x + topic.r * circle.r * Math.cos(dtheta * -i+topic.totalDeltaTheta);
				anchorNodes[i].y = circle.y + topic.r * circle.r * Math.sin(dtheta * -i+topic.totalDeltaTheta);
				i++;
			 }
			 j++
		  }
		  return topic;
	   }
	   topic.initanchorNodes = function(x){
		  if(!arguments.length){
			 return anchorNodes;
		  }
		  anchorNodes = x;
		  return topic;
	   };
	   // topic.items = function(x){
	   // 	if (!arguments.length) return items;
	   // 	items = x;
	   // 	return topic;
	   // }	


	   topic.reorderAnchorLayout = function(){
		  var n = mapping.length;
		  var Temperature = 280;
		  var loops = n;
		  var rounds = 0;
		  var lastValue
			 var curValue = -1;
		  var bestValue = 0;
		  var xx,yy,sx,sy;
		  var k,v;
		  var epsilon = 0.1
			 while (true){
				rounds++;
				lastValue = curValue;
				k = loops;
				while (k--){
				    var xx = Math.floor(Math.random()*n);
				    if (xx==n)xx = n-1;
				    var yy = Math.floor(Math.random()*(n-2))+1;

				    yy = (xx+yy)%n;
				    mapping[xx] = mapping[xx] + mapping[yy];
				    mapping[yy] = mapping[xx] - mapping[yy];
				    mapping[xx] = mapping[xx] - mapping[yy];
				    topic.layout();
				    var v = topic.overlapEval();
				    //						console.log(v);
				    if (v>=curValue){
					   curValue = v;
					   //							console.log("new ",v);
					   if (v>bestValue){
						  bestValue = v;
						  for(e in mapping)
							 bestMapping[e] = mapping[e]
					   }
				    }
				    else if ( Math.exp( (v-curValue)/Temperature) > Math.random()){
					   curValue = v;
				    }
				    else{
					   mapping[xx] = mapping[xx] + mapping[yy];
					   mapping[yy] = mapping[xx] - mapping[yy];
					   mapping[xx] = mapping[xx] - mapping[yy];

				    }
				}
				console.log(lastValue,curValue);
				if (Math.abs(lastValue - curValue )<epsilon){
				    break;
				}
				Temperature *= 0.92
			 }

		  mapping = bestMapping
			 console.log("best",bestValue)


			 console.log("</re>");
		  return topic;
	   }
	   topic.overlapEval = function(){
		  var i,j,n = items.length;
		  var s = 999999999;
		  var t ;
		  var sum=0;
		  var ret=0;
		  for (i = 0 ; i< n; i++){
			 for (j=i+1;j<n;j++){
				t = (items[i].x-items[j].x)*(items[i].x-items[j].x)
				    if (t<1){
					   ret += t;
					   sum++;
				    }
			 }
		  }
		  return ret/sum;
	   }

	   topic.getShowedEdges = function(){
		  ret = [];
		  items.forEach(function(i){
			 if(i.showLinks){
				console.log(i);
				i.neighbors.forEach(function(n){
				    var e = {};
				    e.start = {};
				    e.end = {};
				    e.start.x = i.x
				    e.start.y = i.y
				    var k = mapping[n.id]*meta.num+n.offset;
				e.end.x = anchorNodes[k].x;
				e.end.y = anchorNodes[k].y;
				ret.push(e);
				});
			 }
		  });

		  return ret;
	   }
	   topic.updateTrajectory = function(){
		  trajectories.forEach(function(t){
			 for(var i = t.start;i<t.end;i++){
				polylines[i].highlight = t.highlight;
			 }

		  });
		  return topic;
	   }
	   return topic;
    };


    ringnet.size = function(x) {
	   if (!arguments.length) return size;
	   size = x;
	   return ringnet;
    };

    ringnet.ck = function() {
	   console.log("start check");
	   console.log(ringnet.community.items[0].year);
	   console.log(ringnet.community.links.length);
	   console.log("end check");
    };
    ringnet.init = function(){
	   circle.x = size[0] / 2.0 ;
	   circle.y = size[1] / 2.0 ;
	   circle.r = Math.min(circle.x,circle.y);
	   circle.w = 0.05;
	   ringnet.community 
		  = ringnet.community();
	   ringnet.topic =ringnet.topic();
	   console.log("<1>");
	   ringnet.community.init();	

	   ringnet.topic.init();
	   console.log("</1>");


    }

    ringnet.rotateTopic = function() {
	   topic.totalDeltaTheta = 10;
	   var ta = topic.anchors;
	   // 		do{
	   // 			ringnet.accumulate();
	   // 			ringnet.integrate(5);
	   // 			ringnet.update();
	   // //			console.log(topic.energy,ringnet.tol);
	   // 		}while(topic.energy >= ringnet.tol);

	   var c =0
		  var aN = topic.anchorNodes;
	   var dtheta = 2*Math.PI/aN.length;
	   for (a in ta){
		  ta[a].theta %= (Math.PI*2);
		  for(i = 0;i<topic.meta.num;i++){
			 var cur = aN[c];
			 cur.x =	circle.x + 0.9  * circle.r * Math.cos(dtheta * -i+topic.totalDeltaTheta);
			 cur.y = circle.y + 0.9 * circle.r * Math.cos(dtheta * -i+topic.totalDeltaTheta)
				c++;
		  }
	   }

	   console.log("theta = ",topic.totalDeltaTheta);
	   return ringnet;
    }
    ringnet.getStringForce = function(tag,node,theta){
	   var rt = topic.r*circle.r
		  var rc = community.r * circle.r;
	   var l = Math.sqrt(rt*rt+rc*rc-2*rc*rt*Math.cos(tag.theta-node.theta));
	   //console.log(rt,rc,l);
	   var d = l - ringnet.DEFAULT_SPRING_LENGTH;
	   return ringnet.DEFAULT_SPRING_COEFF * d ;
    }

    ringnet.accumulate = function(){
	   var ca = community.anchors;
	   var ta = topic.anchors;

	   var r = topic.r*circle.r;
	   topic.moment = 0;
	   for ( a in similarity ){
		  for ( b in similarity[a]){
			 var s;
			 for ( e in similarity[a][b]){
				s = similarity[a][b][e];
			 }
			 //console.log("S = ",s);
			 var tag = ca[a];
			 var node =	ta[b];


			 var alpha = tag.theta;
			 var beta = node.theta;

			 var theta = Math.PI/2 - (beta - alpha);
			 var force = ringnet.getStringForce(tag,node,theta);

			 topic.moment += s * force*Math.cos(theta) * r ;
		  }
	   }
	   return ringnet;
    }
    ringnet.integrate = function(timestep){
	   topic.energy = 0;

	   var coeff = timestep / topic.mass
	   //		console.log("topic.moment = ",topic.moment);

		  topic.omiga += coeff * topic.moment;	
	   //		console.log("topic.omiga = ",topic.omiga);

	   topic.theta = ((timestep*topic.omiga)%(Math.PI*2));

	   //		console.log("topic.theta" , topic.theta);

	   topic.energy = topic.theta*topic.theta;

	   return ringnet;
    }

    ringnet.update = function(){

	   for ( e in topic.anchors){
		  topic.anchors[e].theta += topic.theta;
	   }
	   topic.totalDeltaTheta += topic.theta;
	   return ringnet;

    }
		topic.layout = function() {
				document.write("===============<br>");
			if (links.length == 0 || anchorNodes.length < 3){
				console.log("need more links or anchors");
				return;
			}
			var epsilon = 0.1;
			var changed = true;
			while (changed){
				changed = false;
				document.write("------------<br>");
				items.forEach(function(i){
					var X = circle.x*circle.w;
					var Y =	circle.y*circle.w;
					var sw = circle.w;
					var w;
					if(i.neighbors != undefined&&i.neighbors!=null){
						i.neighbors.forEach(function(n){
							w = n.linkWeight;
							var k = mapping[n.id]*meta.num+n.offset;
							X += anchorNodes[k].x*w;
							Y += anchorNodes[k].y*w;
							sw += w ;
						});
						
						document.write(i.name," ",i.year," ",X," ",Y," ",sw," ",i.x," ",i.y,"<br>");
						if (Math.abs(X-i.x*sw)>epsilon||Math.abs(Y-i.y*sw)>epsilon){
							i.x = X/sw;
							i.y = Y/sw;
							changed = true;
						}
					}
					else{
						console.log("warning: no neighbor");
					}
				});
			}
			return topic;
		}

    ringnet.initDisplay = function(){
	   console.log("initdisplay");

	   svg.selectAll("line.community-edges")
		  .remove()
		  svg.selectAll("line.community-edges")
		  .data(ringnet.community.getShowedEdges())
		  .enter().append("line")
		  .attr("class","community-edges")
		  .attr("x1",function(d){return d.start.x;})
		  .attr("y1",function(d){return d.start.y;})
		  .attr("x2", function(d) { return d.end.x; })
		  .attr("y2", function(d) { return d.end.y; })
		  .style("stroke", function(d) { 
			 if(false){
				return color(d.group);
			 }else{
				return "red";
			 }	
		  })
	   svg.selectAll("line.topic-edges")
		  .remove();
	   svg.selectAll("line.topic-edges")
		  .data(ringnet.topic.getShowedEdges())
		  .enter().append("line")
		  .attr("class","topic-edges")
		  .attr("x1",function(d){return d.start.x;})
		  .attr("y1",function(d){return d.start.y;})
		  .attr("x2", function(d) { return d.end.x; })
		  .attr("y2", function(d) { return d.end.y; })
		  .style("stroke", function(d) { 
			 if(false){
				return color(d.group);
			 }else{
				return "red";
			 }	
		  })


	   svg.selectAll("circle.community-anchor")
		  .data(ringnet.community.anchorNodes)
		  .enter().append("circle")
		  .attr("class", "community-anchor")
		  .attr("r", function(d) {
			 if(d.weight>0){
				return Math.sqrt(Math.sqrt(d.weight*10/1));
			 }else{
				return 5;
			 }

		  })
	   .style("stroke", function(d) { 
		  if(d.weight==0){
			 return color(d.group);
		  }
	   })
	   .style("fill", function(d) {
		  if(d.weight>0){
			 return color(d.group);
		  }else{
			 return "white";
		  }
	   })
	   .attr("cx", function(d) { return d.x; })
		  .attr("cy", function(d) { return d.y; })
		  .append("title").text(function(d) { return d.name; });   

	   svg.selectAll("circle.community-items")
		  .data(ringnet.community.items)
		  .enter().append("circle")
		  .attr("class","community-items")
		  .attr("r",3)
		  .style("fill", function(d) { 
			 if(community.primary){
				return color(d.group);
			 }else{
				return "white";
			 }			
		  })
	   .style("z-index", function(){
		  if(community.primary){
			 return 2;
		  }else{
			 return 1;
		  }	
	   })
	   .attr("cx", function(d) { return d.x; })
		  .attr("cy", function(d) { return d.y; })
		  .append("title").text(function(d) { return d.name; });   

	   var n =community.n;

	   svg.selectAll("circle.topic-anchors")
		  .data(ringnet.topic.anchorNodes)
		  .enter().append("circle")
		  .attr("class", "topic-anchors")
		  .attr("r", function(d) {
			 if(d.weight>0){
				return (Math.sqrt(d.weight*1/1));
			 }else{
				return 3;
			 }

		  })
	   .style("stroke", function(d) { 
		  if(d.weight==0){
			 return color(d.group);
		  }
	   })
	   .style("fill", function(d) {
		  if(d.weight>0){
			 return color(d.group);
		  }else{
			 return "white";
		  }
	   })
	   .style("fill", function(d) { return color(d.group);})
		  .attr("cx", function(d) { return d.x; })
		  .attr("cy", function(d) { return d.y; })
		  .append("title").text(function(d) { return d.name; });   

	   svg.selectAll("circle.topic-items")
		  .data(ringnet.topic.items)
		  .enter().append("circle")
		  .attr("class","topic-item")
		  .attr("r",0.1)
		  .style("fill", function(d) { 
			 if(topic.primary){
				return color(d.max);
			 }else{
				return "darkgray";
			 }	
		  })
	   .style("z-index", function(){
		  if(topic.primary){
			 return 2;
		  }else{
			 return -1;
		  }	
	   })
	   .attr("cx", function(d) { return d.x; })
		  .attr("cy", function(d) { return d.y; })
		  .append("title").text(function(d) { return d.name; }); 

	   ringnet.topic.updateTrajectory();
	   svg.selectAll("line.topic-trajectory")
		  .remove();

	   var spline = d3.svg.line()
	   		.x(function(d){
	   			return d.x;
	   		})
	   		.y(function(d, i){
	   			return d.y;
	   		}).interpolate("basis");

	for(var i= 0; i<ringnet.topic.polylines.length;i++){

		   	svg.selectAll("path.topic-trajectory"+i)
			  .data(ringnet.topic.polylines[i])
			  .enter().append("path")
			  .attr("class", "topic-trajectory"+i)
			  .attr("d",spline(ringnet.topic.polylines[i]))
			  // .attr("x1", function(d) { return d.start.x; })
			  // .attr("y1", function(d) { return d.start.y; })
			  // .attr("x2", function(d) { return d.end.x; })
			  // .attr("y2", function(d) { return d.end.y; })
			  .style("stroke", function(d) { 
				 if(d.highlight){
					return "red";
				 }
				 else if(topic.primary){
					return color(d.max);
				 }else{
					return "darkgray";
				 }	
			  }).style("opacity",0.2)

			  .style("fill", function(d){
			  	return "transparent";
			  })
		   .style("z-index", function(){
			  if(topic.primary){
				 return 2;
			  }else{
				 return 1;
			  }	
		   })
		   .style("stroke-width", function(d) { return 0.5; });  

}

	   //		ringnet.community.showitems();
	   //		console.log(ringnet.community.items.length);
    }


    var angle=0;
    ringnet.updateDisplay = function(){
	   angle+=10;
	   if(angle==360)
		  angle=0;
	   console.log(a);
	   svg.selectAll("circle.community-anchor")
		  .data(ringnet.community.anchorNodes)
		  .attr("transform", function(d,i){
			 // a = 40;
			 return "rotate("+[angle,300,300]+")";
		  })
	   svg.selectAll("circle.community-items")
		  .data(ringnet.community.items)
		  .attr("transform", function(d,i){
			 // a = 40;
			 return "rotate("+[angle,300,300]+")";
		  })
	   svg.selectAll("line.community-trajectory")
		  .data(ringnet.community.polylines)
		  .attr("transform", function(d,i){
			 // a = 40;
			 return "rotate("+[angle,300,300]+")";
		  })
	   //    svg.selectAll("circle.topic-anchor")
	   // 	.data(ringnet.topic.anchorNodes)
	   // 	.attr("transform", function(d,i){
	   // 		return "rotate("+[angle,300,300]+")";
	   // 	})
	   // svg.selectAll("circle.topic-item")
	   // 	.data(ringnet.topic.items)
	   // 	.attr("transform", function(d,i){
	   // 			return "rotate("+[angle,300,300]+")";
	   // 	})
	   // svg.selectAll("line.topic-trajectory")
	   //     .data(ringnet.topic.polylines)
	   // 	.attr("transform", function(d,i){
	   // 		return "rotate("+[angle,300,300]+")";
	   // 	})
	   if(running)
		  setTimeout(ringnet.updateDisplay, 100);
    }
    ringnet.checkItem = function(mousePos){
	   console.log(mousePos);
	   ringnet.community.items.forEach(function(i){
		  if (ringnet.dist(mousePos,i)<=5){
			 ret = i;
			 return ;
		  }
	   });
	   ringnet.topic.items.forEach(function(i){
		  if (ringnet.dist(mousePos,i)<=5){
			 ret = i;
			 return ;
		  }
	   });

    }
    // ringnet.CheckTrajectories = function(mousePos){
	   // var pc =ringnet.community.polylines;
	   // ringnet.community.trajectories.forEach(function(t){
		  // for(var i = t.start;i<t.end;i++){
			 // if(ringnet.lineDotDist(pc[i].start,pc[i].end,mousePos)<=1.5){
				// secletedTrajectory = t;
				// return ;
			 // }
		  // }
	   // });

	   // var pt = ringnet.topic.polylines;
	   // ringnet.topic.trajectories.forEach(function(t){
		  // for(var i = t.start;i<t.end;i++){
			 // if(ringnet.lineDotDist(pt[i].start,pt[i].end,mousePos)<=1.5){
				// secletedTrajectory =t;
		  // return;
			 // }
		  // }
	   // });
	   // ret = null;

    // }

    return ringnet;
};




var width = 600,
    height = 600;
running = false;
showLinkNodes = [];
Showtrajectories = []


var click = function(){
    var realpos = mousePos;
    realpos.x = mousePos.x - 10
	   realpos.y = mousePos.y - 10
	   ret = null;
    ringnet.checkItem(mousePos);
    var it = ret;

    showLinkNodes.forEach(function(s){
	   s.showLinks = false;
    });
    Showtrajectories.forEach(function(s){
	   s.highlight = false;
    });

    if (it!=null){
	   it.showLinks = true;
	   showLinkNodes.push(it);
	   ringnet.initDisplay();
	   return;
    }
    secletedTrajectory = null;
    ringnet.CheckTrajectories(mousePos);
    if (secletedTrajectory!=null){
	   secletedTrajectory.highlight = true;
	   Showtrajectories.push(secletedTrajectory);
	   ringnet.initDisplay();
    }
};


//d3.select("body").on("click", click);
var color = d3.scale.category20();
var svg = d3.select("#chart").append("svg")
.attr("width", width)
.attr("height", height)
;

function getUrlVars()
{
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

var ringnet = d3.layout.ringnet().size([width,height]);
var selected_topics = []
var start = 2000
var end = 2010





