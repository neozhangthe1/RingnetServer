var AjaxRequest = {
	get_jconf_topic: function(jconf){
	    $.get('topic/'+'?'+"jconf="+jconf,function(data,textStatus,jqXHR){
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
}

AjaxRequest.render("topic");


$(".jconf").click(function(){
	jconf = $(this).attr("value");

})