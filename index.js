//Script for index html
//by Kent-Na

(function($){
	$(document).ready(function(){
		var url = "ws://rcp.tuna-cat.com:5000/rcp"
		$("#server_url").text(url);

		var rcpConnection = rcpJS.rcpConnection();
		rcpConnection.onopen = function(){
			$("#server_status").text("online");
			rcpConnection.sendOpen();
		}
		rcpConnection.onerror= function(){
			$("#server_status").text("offline(error)");
		}
		rcpConnection.onclose= function(e){
			$("#server_status").text(
				"closed by server(" + e.code + ")");
		}
		rcpConnection.onmessage = function(msg){

		}

		rcpConnection.connectToURL(url);

		var carret_position = 0;
		$("#raw_input").focus();

		//move carret
		$("#input").click(function(e){
			var t_node;
			if (document.caretRangeFromPoint){
				//will be removed.
				var range = document.caretRangeFromPoint(
					e.clientX,e.clientY);
				t_node = range.startContainer;
			}
			else if (document.caretPositionFromPoint){
				//newer method.
				var range = document.caretPositionFromPoint(
					e.clientX,e.clientY);
				t_node = range.offsetNode;
			}
			var itr = $("#input").get(0).firstChild;
			var begin = 0;
			while (! t_node.isEqualNode(itr)){
				if (itr.nodeType == itr.TEXT_NODE){
					begin += itr.length;
				}
				if (itr.nodeType == itr.ELEMENT_NODE){
					if (itr.tagName === "BR"){
						begin += 1;
					}
				}
				itr = itr.nextSibling;
				if (itr == null){
					return;
				}
			}
			carret_position = begin+range.startOffset;
			
			var carret = '<div id="carret"></div>';
			var fragment = range.createContextualFragment(carret);

			var t_node_r = t_node.splitText(range.startOffset);
			$("#carret").remove();
			$("#input").get(0).insertBefore(fragment,t_node_r);

			$("#raw_input").focus();
		})

		function insert_raw_string_before(parent_node, target_node, str){
			var str_elems = str.split(/\n/g);

			var range = document.createRange();
			range.setStart(parent_node,0);
			range.setEnd(parent_node,0);

			for (var i = 0; i<str_elems.length; i++){
				if (i != 0){
					var br_fragment = 
						range.createContextualFragment("<br/>");
					parent_node.insertBefore(br_fragment, target_node);
				}
				{
					var node = new Text(str_elems[i]);
					parent_node.insertBefore(node, target_node);
				}
			}
			//var fragment = range.createContextualFragment(formated);
			//var node = new Text(str);
			//parent_node.insertBefore(fragment, target_node);
		}

		rcpConnection.context.did_replace_text = function(begin, end, diff){
			//Contain charactor at begin and end.

			var container_node = $("#input").get(0);
			var itr = container_node.firstChild;
			var pos = 0;
			var do_serch_begin = true;

			//FIXME: condition checks

			//add dummy node.
			if (itr == null){
				var dummy_node = new Text("");
				container_node.appendChild(dummy_node);
				itr = dummy_node;
			}
			else if (itr.nodeType != itr.TEXT_NODE){
				var dummy_node = new Text("");
				container_node.insertBefore(dummy_node,itr);
				itr = dummy_node;
			}

			while (itr != null){
				if (itr.nodeType == itr.ELEMENT_NODE){
					if (itr.tagName !== "BR"){
						itr = itr.nextSibling;
						continue;
					}
					//BR node
					if (do_serch_begin){
						if (pos + 1 < begin){
							pos += 1;
							itr = itr.nextSibling;
							continue;
						}
						else{
							//Put diff.
							var itr_next = itr.nextSibling;
							if (itr_next == null){
								var dummy_node = new Text("");
								container_node.appendChild(dummy_node);
								itr_next = dummy_node;
							}

							insert_raw_string_before(
									container_node, itr_next, diff);

							pos += 1;
							itr = itr_next;
							do_serch_begin = false;
							console.log("insert_l");
							continue;
						}
					}
					else{
						if (pos + 1 <= end){
							var to_be_removed = itr;
							pos += 1;
							itr = itr.nextSibling;
							container_node.removeChild(to_be_removed);
							continue;
						}
						else{
							break;
						}
					}
					//end DIV node
				}
				else if (itr.nodeType != itr.TEXT_NODE){
					itr = itr.nextSibling;
					continue;
				}

				//TEXT node
				if (do_serch_begin){
					if (pos + itr.length < begin){
						pos += itr.length;
						itr = itr.nextSibling;
						continue;
					}
					else{
						//Put diff.
						var itr_next = itr.splitText(begin-pos);
						insert_raw_string_before(
								container_node, itr_next, diff);
						//var diff_node = new Text(diff);
						//container_node.insertBefore(diff_node,itr_next);
						pos += itr.length;
						itr = itr_next;
						do_serch_begin = false;
						continue;
					}
				}
				else{
					if (pos + itr.length < end){
						var to_be_removed = itr;
						pos += itr.length;
						itr = itr.nextSibling;
						container_node.removeChild(to_be_removed);
						continue;
					}
					else{
						//remove last segment
						var itr_next = itr.splitText(end-pos);
						container_node.removeChild(itr);
						break;
					}
				}
			}

			container_node.normalize();

			//fix carret_position
			if (end <= carret_position)
				carret_position += -(end-begin)+diff.length;
			else if (begin <= carret_position)
				carret_position = begin+diff.length;
		}

		//input caractor
		document.getElementById('raw_input').
			addEventListener("input",
					(function(e){
				//Get and clear input field
				var s = $("#raw_input").val();
				$("#raw_input").val("");

				//And send.
				rcpConnection.context.request_replace_text(
					carret_position, carret_position, s);
				$("#command_log").prepend("re:["+carret_position+":"+
					carret_position+"] with "+s+"<br/>");
		}))

		$("#raw_input").keydown(function(e){
			if (e.keyCode === 8){
				//delete
				if (carret_position>0)
					rcpConnection.context.request_replace_text(
						carret_position-1,carret_position,"");

			}
			if (e.keyCode === 13 && e.shiftKey){
				//shift_enter
				return false;
			}
		})
		$("#raw_input").blur(function(e){
			$("#carret").remove();
		})

		var contents_memory = "";
		$("#button_load").click(function(){
			rcpConnection.context.request_replace_text(
				0, 0, contents_memory);
			//rcpConnection.context.localSite.state.contents = 
				//contents_memory;
		});
		$("#button_store").click(function(){
			contents_memory = 
				rcpConnection.context.localSite.state.contents;
		});

	});
})(jQuery)

