var ret
var secletedTrajectory
d3.layout.ringnet = function(){
    ringnet.init = function(){
	   circle.x = size[0] / 2.0 ;
	   circle.y = size[1] / 2.0 ;
	   circle.r = Math.min(circle.x,circle.y);
	   circle.w = 0.05;
	   ringnet.topic =ringnet.topic();
	   console.log("<1>");
	   ringnet.topic.init();
	   console.log("</1>");
    }





    ////////////////////////////////////////
    ///topic
    ////////////////////////////////////////
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
			 }
			 i++;
			 trajectories[t].end = i;
		  }
		  return topic;
	   }	
	}
}

var ringnet = d3.layout.ringnet().size([width,height]);
var AjaxRequest = {
	render: function(context){
	    $.get('render/'+context+'?'+window.location.href.slice(window.location.href.indexOf('?') + 1),function(data,textStatus,jqXHR){
	    	json.topic = JSON.parse(data);
		    ringnet.topic(json.topic);
		    ringnet.init();

		    ringnet.topic
		    .initPosition()
		    .index()
			.reorderAnchorLayout()
		    ringnet
			.rotateTopic()
		 	//ringnet.community
			// .modifyAnchors()
		    ringnet.topic
			.modifyAnchors()
		    ringnet.initDisplay();
	    })
	}
}

AjaxRequest.render("topic");



