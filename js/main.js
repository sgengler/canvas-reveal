// depends on jQuery

(function() {

var image = { // back and front images
		'back': { 'url':'images/background.jpg', 'img':null },
		'front': { 'url':'images/foreground-ice.jpg', 'img':null }
	},
	canvas = {'temp':null, 'draw':null},
	$canvas,
	canvasEl,
	mouseDown = false,
	points = [],
	winWidth,
	winHeight,
	imgWidth,
	imgHeight;

var options = {
	fadeTimer: 1000
}


function supportsCanvas() {
	return !!document.createElement('canvas').getContext;
}

function getEventCoords(ev) {
	var first, coords = {};
	var origEv = ev.originalEvent;

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
	var tempctx = canvas.temp.getContext('2d');
	var mainctx = main.getContext('2d');

	canvas.temp.width = canvas.temp.width;

	tempctx.drawImage(canvas.draw, 0, 0, canvas.temp.width, canvas.temp.height);
	tempctx.globalCompositeOperation = 'source-atop';
	tempctx.drawImage(image.back.img, 0, 0, canvas.temp.width, canvas.temp.height);
	mainctx.drawImage(image.front.img, 0, 0, canvas.temp.width, canvas.temp.height);
	mainctx.drawImage(canvas.temp, 0, 0, canvas.temp.width, canvas.temp.height);
}

function setPoints(can) {

  var now = Date.now();

  for (var i = 0; i < points.length; i++) {
    if(points[i].time > (now - options.fadeTimer)) {
      firstPoint = i;
			points = points.splice(i - points.length);
      break;
    }
  }

  var totalPoints = points.length,
		ctx = can.getContext('2d');

	ctx.lineCap = ctx.lineJoin = 'round';
  ctx.shadowBlur=30;
  ctx.shadowColor="black";
	ctx.strokeStyle = '#f00'; // any color
  ctx.clearRect(0,0,can.width,can.height);

  if(totalPoints < 2) {return;} //making sure the points fade out completely

  for(var i=1;i<points.length;i++){
    var lineW = Math.sqrt(Math.pow(points[i].x - points[i - 1].x, 2) + Math.pow(points[i].y - points[i - 1].y, 2)); //euclidean norm!!!
    ctx.lineWidth = 25 + 75 * Math.max(1 - lineW / 50, 0);
    ctx.strokeStyle = "rgba(0,0,0," + Math.max(1 - (now - points[i].time) / 1000, 0) + ")";

    ctx.beginPath();
    ctx.moveTo(points[i - 1].x, points[i - 1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke()
  }
}


function setCanvasSize() {
	canvasEl = $canvas.get(0);

	winWidth = $(window).width();
	winHeight = $(window).height();


	var imgRatio = image.back.img.width / image.back.img.height,
		winRatio = winWidth / winHeight;

	canvasEl.width = winWidth;
	canvasEl.height = winHeight;


	if(imgRatio < winRatio) {
		canvasEl.width = winWidth;
	  canvasEl.height = canvasEl.width * (image.back.img.height / image.back.img.width);
	} else {
		canvasEl.height = winHeight;
	  canvasEl.width = canvasEl.height * (image.back.img.width / image.back.img.height);
	}

	$canvas.css({
		'margin-left': -(canvasEl.width - winWidth) / 2,
		'margin-top': -(canvasEl.height - winHeight) / 2
	})

	// create the temp and draw canvases, and set their dimensions
	// to the same as the main canvas:
	canvas.temp = document.createElement('canvas');
	canvas.draw = document.createElement('canvas');
	canvas.temp.width = canvas.draw.width = canvasEl.width;
	canvas.temp.height = canvas.draw.height = canvasEl.height;

	// draw the stuff to start
	recompositeCanvases();
}

$(window).on('resize', setCanvasSize);

/**
 * Set up the main canvas and listeners
 */
function setupCanvases() {
	$canvas = $('#maincanvas');
	setCanvasSize();

	function mousedown_handler(e) {
		var coords = getLocalCoords(canvasEl, getEventCoords(e));
		mouseDown = true;

		setPoints(canvas.draw, coords.x, coords.y, true);
		recompositeCanvases();

		return false;
	};

  function mousemove_handler(e) {
		var coords = getLocalCoords(canvasEl, getEventCoords(e));

    points.push({
      x: coords.x,
      y: coords.y,
      time: Date.now()
    });

		return false;
	};

  function animate() {
    if(!mouseDown && points.length < 2) {return}
    reqAF(animate);
    setPoints(canvas.draw);
    recompositeCanvases();
  }

	function mouseover_handler(e) {
    mouseDown = true;
		animate();
	};

	function mouseout_handler(e) {
		if (mouseDown) {
			mouseDown = false;
			return false;
		}
	};

	$canvas.on('mouseover mousedown touchstart', mouseover_handler)
    .on('mousemove touchmove', mousemove_handler)
    .on('mouseout mouseup touchend', mouseout_handler)
}

function loadingComplete() {
	//load stuff here
}

var reqAF = requestAnimationFrame || webkitRequestAnimationFrame || mozRequestAnimationFrame || oRequestAnimationFrame || msRequestAnimationFrame || function(timer) {setTimeout(timer, 10)}

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

	for (side in image) {
		if (image.hasOwnProperty(side)) {
			loadTotal++;
		}
	}

	for (side in image) if (image.hasOwnProperty(side)) {
		image[side].img = document.createElement('img'); // image is global
		$(image[side].img).on('load', imageLoaded);
		image[side].img.src = image[side].url;
	}

}

$(function() {
	if (supportsCanvas()) {
		loadImages();
	}
});

})();
