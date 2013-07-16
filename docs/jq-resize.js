// jq-resize
//  derived from "jqDnR" by Brice Burgess http://dev.iceburg.net/jquery/jqDnR/
(function($){
$.fn.jqResize=function(opt){return i(this,opt);};
$.jqDnR={
	dnr:{},
	e:0,
	drag:function(v){
 		E.css({
 			width:Math.max(v.pageX-M.pX+M.W,0,M.minW),
 			height:Math.max(v.pageY-M.pY+M.H,0,M.minH)
 		});
  		return false;
  	},
	stop:function(){
		$(document).unbind('mousemove',J.drag).unbind('mouseup',J.stop);
	}
};
var J=$.jqDnR,M=J.dnr,E=J.e,
i=function(e,opt){
	h=opt.handle;
	minW=opt.min_width||0;
	minH=opt.min_height||0;
	return e.each(function(){
		h=(h)?$(h,e):e;
 		h.bind('mousedown',{e:e},function(v){
 			var d=v.data,p={};E=d.e;
 			M={
 				X:p.left||f('left')||0,
 				Y:p.top||f('top')||0,
 				W:f('width')||E[0].scrollWidth||0,
 				H:f('height')||E[0].scrollHeight||0,
 				pX:v.pageX,
 				pY:v.pageY,
 				minW:minW,
 				minH:minH
 			};
 			$(document).mousemove($.jqDnR.drag).mouseup($.jqDnR.stop);
 			return false;
 		});
	});
},
f=function(k){return parseInt(E.css(k))||false;};
})(jQuery);
