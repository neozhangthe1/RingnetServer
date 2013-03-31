var wordscale = d3.scale.linear().domain([200, 30000]).range([1, 30]);
var tagwidth = 250, tagheight = 120;
var maxsize = 40;


d3.select("#tagcloud").style("opacity", 0);


var set_tagcloud_scale = function(tagcloud){
	var m = 0, n = 100000;
	tagcloud.words.forEach(function(d){
		m = m > d.size ? m : d.size;
		n = n < d.size ? n : d.size;
	});
	
	var space = tagheight*tagwidth*0.1/(tagcloud.words.length*tagcloud.words.length*0.1*0.16);
/* 	wordscale.domain([n, m]).range([1, space]); */

	if(space > maxsize){
		wordscale.domain([n-1, m+1]).range([1, maxsize]);
	}else{
		wordscale.domain([n, m]).range([1, space]);
	}
	
}

var new_tagcloud = function(x, y, t){
	d3.select(".plot")
	.append("g")
	.attr("id", "tagcloud")
	.attr("transform", "translate("+ x + "," + y +")");
}

var remove_content = function() {
	$("#tagcloud").empty();
}

var generate_tagcloud = function(tagcloud, x, y, t){
	remove_content();
	new_tagcloud(x, y, t);
	set_tagcloud_scale(tagcloud);
	
	d3.layout.cloud().size([tagwidth, tagheight])
      .words(tagcloud.words.map(function(d) {
        return {text: d.text, size: wordscale(d.size), color: d.color};
      }))
      .rotate(function() { return 0; }) //~~(Math.random() * 2) * 90
      .font("Impact")
      .fontSize(function(d) { return d.size; })
      .on("end", draw)
      .start(); 
      
    function draw(words) {
	    tags = d3.select("#tagcloud").append("svg").attr("id", "tc")
	        .attr("width", tagwidth)
	        .attr("height", tagheight);
	     
	      tags.append("rect")
	      .attr("width", tagwidth)
	      .attr("height", tagheight)
	      .style("fill", "transparent")
	      .style("stroke", "transparent")
	      .style("stroke-width", "1px");
	     
	      tags.append("g")
	        .attr("transform", "translate(" + tagwidth / 2.0 + "," + tagheight / 2.0 + ")")
	        .selectAll("text")
	        .data(words)
	      .enter().append("text")
	        .style("font-size", function(d) { return d.size + "px"; })
	        .style("font-family", "Impact")
	        .style("fill", function(d, i) { return d.color; })
	        .attr("text-anchor", "middle")
	        .attr("transform", function(d) {
	          return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
	        })
	        .text(function(d) { return d.text; });
	     
	}
}


