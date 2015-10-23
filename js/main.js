// depends on jQuery

(function() {

var image = { // back and front images
	'back': { 'url':'images/background.jpg', 'img':null },
	'front': { 'url':'images/foreground.jpg', 'img':null }
};

var canvas = {'temp':null, 'draw':null}; // temp and draw canvases
var mouseDown = false;


function supportsCanvas() {
	return !!document.createElement('canvas').getContext;
}

function getEventCoords(ev) {
	var first, coords = {};
	var origEv = ev.originalEvent; // get from jQuery

	if (origEv.changedTouches != undefined) {
		first = origEv.changedTouches[0];
		coords.pageX = first.pageX;
		coords.pageY = first.pageY;
	} else {
		coords.pageX = ev.pageX;
		coords.pageY = ev.pageY;
	}

	return coords;
}

function getLocalCoords(elem, coords) {
	var ox = 0, oy = 0;

	while (elem != null) {
		ox += elem.offsetLeft;
		oy += elem.offsetTop;
		elem = elem.offsetParent;
	}

	return { 'x': coords.pageX - ox, 'y': coords.pageY - oy };
}

function recompositeCanvases() {
	var main = $('#maincanvas').get(0);
	var drawthumb = $('#drawthumb').get(0);
	var tempthumb = $('#tempthumb').get(0);
	var tempctx = canvas.temp.getContext('2d');
	var mainctx = main.getContext('2d');

	// Step 1: clear the temp
	canvas.temp.width = canvas.temp.width; // resizing clears

	// Step 2: stamp the draw on the temp (source-over)
	tempctx.drawImage(canvas.draw, 0, 0, canvas.temp.width, canvas.temp.height);

	// Step 3: stamp the background on the temp (!! source-atop mode !!)
	tempctx.globalCompositeOperation = 'source-atop';
	tempctx.drawImage(image.back.img, 0, 0, canvas.temp.width, canvas.temp.height);

	// Step 4: stamp the foreground on the display canvas (source-over)
	mainctx.drawImage(image.front.img, 0, 0, canvas.temp.width, canvas.temp.height);

	// Step 5: stamp the temp on the display canvas (source-over)
	mainctx.drawImage(canvas.temp, 0, 0, canvas.temp.width, canvas.temp.height);

}

var points=[];



/**
 * Draw a scratch line
 *
 * @param can the canvas
 * @param x,y the coordinates
 * @param fresh start a new line if true
 */
function scratchLine(can) {
  var now = Date.now();

  var fadeTimer = 500,
    firstPoint = null;

  for (var i = 0; i < points.length; i++) {
    if(points[i].time > (now - fadeTimer)) {
      firstPoint = i;
      break;
    }
  }

  if(firstPoint) {
    points = points.splice(firstPoint - points.length);
  }

  var totalPoints = points.length;


	var ctx = can.getContext('2d');

	ctx.lineCap = ctx.lineJoin = 'round';
  ctx.shadowBlur=30;
  ctx.shadowColor="black";
	ctx.strokeStyle = '#f00'; // can be any opaque color

  ctx.clearRect(0,0,can.width,can.height);

  for(var i=1;i<points.length;i++){
    var lineW = Math.sqrt(Math.pow(points[i].x - points[i - 1].x, 2) + Math.pow(points[i].y - points[i - 1].y, 2));
    ctx.lineWidth = 25 + 75 * Math.max(1 - lineW / 50, 0);
    ctx.strokeStyle = "rgba(0,0,0," + Math.max(1 - (now - points[i].time) / 1000, 0) + ")";

    ctx.beginPath();
    ctx.moveTo(points[i - 1].x, points[i - 1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke()
  }
	ctx.stroke();
}

/**
 * Set up the main canvas and listeners
 */
function setupCanvases() {
	var c = $('#maincanvas').get(0);

	// set the width and height of the main canvas from the first image
	// (assuming both images are the same dimensions)

  c.height = c.width * (image.back.img.height / image.back.img.width);

	// create the temp and draw canvases, and set their dimensions
	// to the same as the main canvas:
	canvas.temp = document.createElement('canvas');
	canvas.draw = document.createElement('canvas');
	canvas.temp.width = canvas.draw.width = c.width;
	canvas.temp.height = canvas.draw.height = c.height;


	// draw the stuff to start
	recompositeCanvases();

	/**
	 * On mouse down, draw a line starting fresh
	 */
	function mousedown_handler(e) {
		var local = getLocalCoords(c, getEventCoords(e));
		mouseDown = true;

		scratchLine(canvas.draw, local.x, local.y, true);
		recompositeCanvases();

		return false;
	};

  function mousemove_handler(e) {
		var local = getLocalCoords(c, getEventCoords(e));

    points.push({
      x: local.x,
      y: local.y,
      time: Date.now()
    });

		return false;
	};

  function animate() {
    if(!mouseDown && points.length < 2) {return}
    requestAnimationFrame(animate);
    scratchLine(canvas.draw);
    recompositeCanvases();
  }

	/**
	 * On mouse move, if mouse down, draw a line
	 *
	 * We do this on the window to smoothly handle mousing outside
	 * the canvas
	 */
	function mouseover_handler(e) {
    mouseDown = true;
		animate();
	};

	/**
	 * On mouseup.  (Listens on window to catch out-of-canvas events.)
	 */
	function mouseout_handler(e) {
		if (mouseDown) {
			mouseDown = false;
			return false;
		}
		return true;
	};

	$('#maincanvas').on('mouseover', mouseover_handler)
    .on('mousemove', mousemove_handler)
    .on('mouseout', mouseout_handler)
		.on('touchstart', mousedown_handler);

	// $(document).on('mousemove', mousemove_handler);
	// $(document).on('touchmove', mousemove_handler);
  //
	// $(document).on('mouseout', mouseup_handler);
	// $(document).on('touchend', mouseup_handler);
}

/**
 * Set up the DOM when loading is complete
 */
function loadingComplete() {
	$('#loading').hide();
	$('#main').show();
}

function reqAF() {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(timer) {
        window.setTimeout(timer, 10);
    }
}

/**
 * Handle loading of needed image resources
 */
function loadImages() {
	var loadCount = 0;
	var loadTotal = 0;
	var loadingIndicator;

	function imageLoaded(e) {
		loadCount++;

		if (loadCount >= loadTotal) {
			setupCanvases();
			loadingComplete();
		}
	}

	for (k in image) if (image.hasOwnProperty(k))
		loadTotal++;

	for (k in image) if (image.hasOwnProperty(k)) {
		image[k].img = document.createElement('img'); // image is global
		$(image[k].img).on('load', imageLoaded);
		image[k].img.src = image[k].url;
	}
}

/**
 * Handle page load
 */
$(function() {
	if (supportsCanvas()) {
		loadImages();

		$('#resetbutton').on('click', function() {
				// clear the draw canvas
				canvas.draw.width = canvas.draw.width;
				recompositeCanvases()

				return false;
			});
	} else {
		$('#loading').hide();
		$('#lamebrowser').show();
	}
});

})();
