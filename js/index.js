var Timeline = function (videoId) {
  this.zoomOnScroll = true;
  this.hideTracksOnSelection = false;
  // Video controlloing variables
  this.videoId = videoId;
  this.videoElement = document.getElementById(this.videoId);
  this.startTime = 0; //TEMP!
  this.endTime = 10; //TEMP!
  // Timeline controlloing variables
  this.currentTrackIndex = -1;
  this.clickedTrackIndex = -1;
  this.currentAnnotationIndex = -1;
  this.loadedAnnotationIndex = -1;
  this.loadedAnnotationTrackIndex = -1;
  this.tracks = [];
  this.time = 0;
  this.totalTime = 0;
  this.loopCount = 0;
  this.playing = false;
  var self = this;
  if (!this.videoElement) { console.log("DOM does not contain video with this ID"); return; }
  this.videoElement.addEventListener('loadedmetadata', function () {
    self.endTime = self.videoElement.duration;
  });
  this.videoElement.addEventListener('ended', function () {
    self.playing = false;
    self.videoElement.pause();
  });
  this.videoElement.addEventListener('timeupdate', function () {
    self.time = self.videoElement.currentTime;
    self.totalTime = self.videoElement.duration;
    if (self.playing) {
      self.update();
    }
    if (self.rangeMode !== RANGE_MODE_PLAY_SELECTED)
      return;
    const endTime = document.getElementById("af-end-time").value;
    const startTime = document.getElementById("af-start-time").value;
    if (endTime <= startTime)
      return;
    if (self.videoElement.currentTime > endTime || self.videoElement.currentTime < startTime) {
      self.videoElement.currentTime = startTime;
      if (!self.loopMode) {
        self.pause();
      } else {
        self.loopCount++;
      }
    }
  }, false);
  this.videoElement.addEventListener('play', function () {
    self.playing = true;
  });
  this.videoElement.addEventListener('pause', function () {
    self.playing = false;
  });
  this.videoElement.addEventListener('seeking', function () {
    self.playing = false;
  });
  this.videoElement.addEventListener('seeked', function () {
    self.playing = false;
  });
  this.videoElement.addEventListener('waiting', function () {
    self.playing = false;
  });
  // Related to the VideoFrameJs
  this.videoFrameObject = VideoFrame({ id: videoId });
  // Video frame controlloing variables
  this.seekMode = 0; // 0 - seek by frames (default), 1 - seek by seconds
  // Video playback controlloing variables
  this.rangeMode = 0; // 0 - play all video, 1 - play the selected range from start to end
  this.loopMode = false; // false: Play once, true: Loop infinitely
  setInterval(function () {
    self.update();
  }, 1000 / 30);
}

Timeline.prototype.addTrack = function (id, name = "track", annotations = [], color = "#ffffff") {
  // sort annotations by thier start time
  annotations = annotations.sort(function (a, b) {
    return a.startTime - b.startTime;
    // (a.endTime - a.startTime) - (b.endTime - b.startTime); //sort by duration
  });
  let track = {
    id: id,
    index: this.tracks.length,
    name: name,
    color: color,
    annotations: annotations,
  }
  this.tracks.push(track);
  document.getElementById("af-tracks-select").innerHTML += "<option value='" + track.index + "'>" + track.name + "</option>";
}


Timeline.prototype.play = function () {
  this.playing = true;
  this.shouldPlay = false;
  //play video if it already loaded. If not it will play automatically after being loaded in
  //createVideoElement
  var el;
  if (el = document.getElementById(this.videoId)) {
    el.play();
    this.time = el.currentTime;
  }
}

Timeline.prototype.pause = function () {
  this.playing = false;
  document.getElementById(this.videoId).pause();
}

Timeline.prototype.stop = function () {
  this.playing = false;
  this.time = 0;
  this.prevTime = this.time - FRAME_DELTA;

  document.getElementById(this.videoId).pause();
  document.getElementById(this.videoId).currentTime = 0;

}

Timeline.prototype.changeTrack = function (newTrack) {
  if (newTrack === null)
    return;
  //check if playing and pause current video
  var needRestart = false;
  if (this.playing) {
    this.pause();
    needRestart = true;
  }
  this.currentTrackIndex = newTrack.index;
  //restart if required
  if (needRestart)
    this.play();
}

//    _    _ ______ _      _____  ______ _____   
//   | |  | |  ____| |    |  __ \|  ____|  __ \  
//   | |__| | |__  | |    | |__) | |__  | |__) | 
//   |  __  |  __| | |    |  ___/|  __| |  _  /  
//   | |  | | |____| |____| |    | |____| | \ \  
//   |_|  |_|______|______|_|    |______|_|  \_\ 
//                                               
//                                                                                                                                                         

Timeline.prototype.preUpdate = function () {
  //check video has content
  var currentVideo = document.getElementById(this.videoId);
  if (currentVideo.readyState < currentVideo.HAVE_FUTURE_DATA) {
    if (this.playing) {
      this.pause();
      this.shouldPlay = true;
    }
  } else if (this.shouldPlay) {
    this.shouldPlay = false;
    this.play();
  }
  this.updateGUI();
}

Timeline.prototype.update = function () {
  this.preUpdate();

  if (this.playing) {
    this.totalTime += FRAME_DELTA;
    this.prevTime = this.time;
    this.time += FRAME_DELTA;
  }
  // if (this.loopMode != 0) {
  //   var camEnd = this.findVideoDuration();
  //   if (this.time > camEnd) {
  //     this.loopCount++;
  //     this.time = 0;
  //   }
  //   if (this.loopMode == -1) {
  //     //loop infinitely
  //   }
  //   else {
  //     if (this.loopCount >= this.loopMode) {
  //       this.playing = false;
  //     }
  //   }
  // }
}

Timeline.prototype.getAnnotationAt = function (mouseX, mouseY) {
  var scrollY = this.tracksScrollY * (this.tracks.length * this.trackLabelHeight - this.canvas.height + this.headerHeight);
  var clickedTrackNumber = Math.floor((mouseY - this.headerHeight + scrollY) / this.trackLabelHeight);

  if (clickedTrackNumber >= 0 && clickedTrackNumber >= this.tracks.length) {
    return null;
  }
  this.clickedTrackIndex = clickedTrackNumber;
  var mouseXTime = this.xToTime(mouseX);
  // specifiy which annotation is clicked
  var selectedAnnotationIndex = -1;
  for (var i = this.tracks[clickedTrackNumber].annotations.length - 1; i > -1; i--) {
    var annotation = this.tracks[clickedTrackNumber].annotations[i];
    if (annotation.startTime <= mouseXTime && annotation.endTime >= mouseXTime) {
      selectedAnnotationIndex = i;
      break;
    }
  }
  if (selectedAnnotationIndex == -1) {
    return null;
  }
  if (selectedAnnotationIndex !== -1 && clickedTrackNumber !== -1) {
    var annotation = this.tracks[clickedTrackNumber].annotations[selectedAnnotationIndex];
    this.tracks[clickedTrackNumber].annotations.splice(selectedAnnotationIndex, 1);
    this.tracks[clickedTrackNumber].annotations.push(annotation);
    selectedAnnotationIndex = this.tracks[clickedTrackNumber].annotations.length - 1;
  }
  return selectedAnnotationIndex;
}

Timeline.prototype.getTrackAt = function (mouseX, mouseY) {
  if (mouseX > this.trackLabelWidth) {
    return null;
  }
  var scrollY = this.tracksScrollY * (this.tracks.length * this.trackLabelHeight - this.canvas.height + this.headerHeight);
  var clickedTrackNumber = Math.floor((mouseY - this.headerHeight + scrollY) / this.trackLabelHeight);

  if (clickedTrackNumber >= 0 && clickedTrackNumber >= this.tracks.length) {
    return null;
  }

  return this.tracks[clickedTrackNumber];
}




Timeline.prototype.findVideoDuration = function () {
  return this.endTime;
}

Timeline.prototype.timeToX = function (time) {
  var animationEnd = this.findVideoDuration();
  var visibleTime = this.xToTime(this.canvas.width - this.trackLabelWidth - this.tracksScrollWidth) - this.xToTime(20); //50 to get some additional space
  if (visibleTime < animationEnd) {
    time -= (animationEnd - visibleTime) * this.timeScrollX;
  }

  return this.trackLabelWidth + time * (this.timeScale * 200) + 10;
}

Timeline.prototype.xToTime = function (x) {
  var animationEnd = this.findVideoDuration();
  var visibleTime = (this.canvas.width - this.trackLabelWidth - this.tracksScrollWidth - 20) / (this.timeScale * 200);
  var timeShift = Math.max(0, (animationEnd - visibleTime) * this.timeScrollX);
  return (x - this.trackLabelWidth - 10) / (this.timeScale * 200) + timeShift;
}


// Context menu utilites
Timeline.prototype.contextMenuShow = function (event) {
  let contextMenu = document.getElementById("timeline-cm")
  contextMenu.style.display = "block";
  contextMenu.style.left = Math.min(event.pageX, window.innerWidth - contextMenu.offsetWidth) + "px";
  contextMenu.style.top = Math.min(event.pageY, window.innerHeight - contextMenu.offsetHeight) + "px";
  if (this.currentAnnotationIndex != -1) {
    document.getElementById("cm-delete").style.display = "block";
  } else {
    document.getElementById("cm-delete").style.display = "none";
  }
}

Timeline.prototype.contextMenuHide = function () {
  let contextMenu = document.getElementById("timeline-cm")
  contextMenu.style.display = "none"
}

Timeline.prototype.onContextMenu = function (event) {
  event.preventDefault();
  // event.stopPropagation();
  event.stopImmediatePropagation();
  this.contextMenuShow(event);
}


Timeline.prototype.contextMenuSetStartTime = function (event) {
  var t = this.xToTime(event.pageX);
  this.pause();
  this.videoElement.currentTime = t;
  document.getElementById("af-start-time").value = t;
  this.contextMenuHide(event);
}

Timeline.prototype.contextMenuSetEndTime = function (event) {
  var t = this.xToTime(event.pageX);
  this.pause();
  this.videoElement.currentTime = t;
  document.getElementById("af-end-time").value = t;
  this.contextMenuHide(event);
}

Timeline.prototype.contextMenuEditAnnotation = function (event) {
  annotationFormLoad(this.clickedTrackIndex, this.currentAnnotationIndex);
  this.contextMenuHide(event);
}

Timeline.prototype.annotationFormLoad = function (trackIndex, annotationIndex) {
  if (trackIndex == undefined) {
    trackIndex = -1;
  }
  if (annotationIndex == undefined) {
    annotationIndex = -1;
  }
  if (annotationIndex !== -1 && trackIndex !== -1 && this.tracks?.[trackIndex]?.annotations?.[annotationIndex]) {
    document.getElementById('af-delete').style.display = 'unset';
    document.getElementById('af-title').innerHTML = "Edit Annotation";
    document.getElementById('af-tracks-select').value = trackIndex;
    document.getElementById('af-text').value = timeline.tracks[trackIndex].annotations[annotationIndex].text;
    document.getElementById('af-start-time').value = timeline.tracks[trackIndex].annotations[annotationIndex].startTime;
    document.getElementById('af-end-time').value = timeline.tracks[trackIndex].annotations[annotationIndex].endTime;
  } else {
    document.getElementById('af-delete').style.display = 'none';
    this.annotationFormCancel();
  }
}
Timeline.prototype.annotationFormSave = function () {
  let trackIndex = document.getElementById('af-tracks-select').value;
  let annotationIndex = -1;
  let startTime = parseFloat(document.getElementById('af-start-time').value);
  let endTime = parseFloat(document.getElementById('af-end-time').value);
  let text = document.getElementById('af-text').value;
  if (startTime >= endTime) {
    alert("Start time must be before end time");
    return;
  }
  if (startTime < 0) {
    alert("Start time must be after 0");
    return;
  }
  if (endTime > this.findVideoDuration()) {
    alert("End time must be before end of video");
    return;
  }
  if (trackIndex == -1) {
    alert("Please select a track");
    return;
  }
  if (text.length == 0) {
    alert("Annotation text cannot be empty");
    return;
  }
  if (isNaN(startTime) || isNaN(endTime)) {
    alert("Invalid time");
    return;
  }
  if (this.clickedTrackIndex !== -1 && this.currentAnnotationIndex !== -1) {
    // edit existing annotation
    annotationIndex = this.currentAnnotationIndex;
    this.tracks[this.clickedTrackIndex].annotations[annotationIndex].text = text;
    this.tracks[this.clickedTrackIndex].annotations[annotationIndex].startTime = startTime;
    this.tracks[this.clickedTrackIndex].annotations[annotationIndex].endTime = endTime;
    // store annotation in temporary variable
    let annotation = this.tracks[trackIndex].annotations[annotationIndex];
    // remove annotation from track
    this.tracks[this.clickedTrackIndex].annotations.splice(this.currentAnnotationIndex, 1);
    // add annotation to new track
    this.tracks[trackIndex].annotations.push(annotation);
  } else {
    // add new annotation
    trackIndex = document.getElementById('af-tracks-select').value;
    let annotation = {
      text: text,
      startTime: startTime,
      endTime: endTime
    };
    this.tracks[trackIndex].annotations.push(annotation);
  }
  this.annotationFormCancel();
}

Timeline.prototype.annotationFormDelete = function () {
  if (this.clickedTrackIndex !== -1 && this.currentAnnotationIndex !== -1) {
    this.tracks[this.clickedTrackIndex].annotations.splice(this.currentAnnotationIndex, 1);
  }
  this.annotationFormCancel();
}

Timeline.prototype.annotationFormCancel = function (event) {
  this.clickedTrackIndex = -1;
  this.currentAnnotationIndex = -1;
  this.loadedAnnotationIndex = -1;
  this.loadedAnnotationTrackIndex = -1;
  this.contextMenuHide(event);
  document.getElementById('af-delete').style.display = 'none';
  document.getElementById('af-title').innerHTML = "Add Annotation";
  document.getElementById('af-tracks-select').value = -1;
  document.getElementById('af-text').value = "";
  document.getElementById('af-start-time').value = 0;
  document.getElementById('af-end-time').value = 0;
}

Timeline.prototype.contextMenuDeleteAnnotation = function (event) {
  this.contextMenuHide();
  if (this.currentAnnotationIndex != -1 && this.clickedTrackIndex != -1) {
    this.tracks[this.clickedTrackIndex].annotations.splice(this.currentAnnotationIndex, 1);
    this.currentAnnotationIndex = -1;
    this.update();
  }
  this.annotationFormCancel();
}



Timeline.prototype.contextMenuZoomin = function () {
  this.contextMenuHide();
  this.timeScale = Math.min(1, this.timeScale + 0.05);
  this.update();
}

Timeline.prototype.contextMenuZoomout = function () {
  this.contextMenuHide();
  this.timeScale = Math.max(0.01, this.timeScale - 0.05);
  this.update();
}

Timeline.prototype.contextMenuToggleMouseWheelMode = function () {
  this.contextMenuHide();
  this.zoomOnScroll = !this.zoomOnScroll;
  if (this.zoomOnScroll) {
    document.getElementById('cm-mode').innerHTML = "Scroll on mousewheel";
    this.canvas.removeEventListener('mousewheel', this.defaultOnMouseWheelListener);
    this.canvas.addEventListener('mousewheel', this.zoomOnMouseWheelListener);
  } else {
    document.getElementById('cm-mode').innerHTML = "Zoom on mousewheel";
    this.canvas.removeEventListener('mousewheel', this.zoomOnMouseWheelListener);
    this.canvas.addEventListener('mousewheel', this.defaultOnMouseWheelListener);
  }
}

Timeline.prototype.contextMenuToggleSelectionMode = function () {
  this.contextMenuHide();
  this.hideTracksOnSelection = !this.hideTracksOnSelection;
  if (this.hideTracksOnSelection) {
    document.getElementById('cm-selection').innerHTML = "Show all tracks";
  } else {
    document.getElementById('cm-selection').innerHTML = "Hide tracks on selection";
  }
}


//     _____ _    _ _____ 
//    / ____| |  | |_   _|
//   | |  __| |  | | | |  
//   | | |_ | |  | | | |  
//   | |__| | |__| |_| |_ 
//    \_____|\____/|_____|
//                        
//         

Timeline.prototype.initGUI = function () {
  var self = this;

  this.trackLabelWidth = 108;
  this.trackLabelHeight = 20;
  this.tracksScrollWidth = 16;
  this.tracksScrollHeight = 0;
  this.tracksScrollThumbPos = 0;
  this.tracksScrollThumbHeight = 0;
  this.tracksScrollY = 0;
  this.timeScrollWidth = 0;
  this.timeScrollHeight = 16;
  this.timeScrollThumbPos = 0;
  this.timeScrollThumbWidth = 0;
  this.timeScrollX = 0;
  this.headerHeight = 30;
  this.canvasHeight = 200;
  this.draggingTime = false;
  this.draggingTracksScrollThumb = false;
  this.draggingTimeScrollThumb = false;
  this.draggingKeys = false;
  this.draggingTimeScale = false;
  this.selectedKeys = [];
  this.timeScale = 0.08;

  this.container = document.createElement("div");
  this.container.id = "timeline";
  this.container.style.display = "block";
  this.container.style.width = "100%";
  this.container.style.height = this.canvasHeight + "px";
  this.container.style.background = "#EEEEEE";
  this.container.style.position = "fixed";
  this.container.style.left = "0px";
  this.container.style.bottom = "0px";
  document.body.appendChild(this.container);

  this.splitter = document.createElement("div");
  this.splitter.style.width = "100%";
  this.splitter.style.height = "4px";
  this.splitter.style.cursor = "ns-resize";
  this.splitter.style.position = "fixed";
  this.splitter.style.left = "0px";
  this.splitter.style.bottom = (this.canvasHeight - 2) + "px";
  this.splitter.addEventListener("mousedown", function () { //TODO move splitter
    function mouseMove(e) {
      var h = (window.innerHeight - e.clientY);
      self.splitter.style.bottom = (h - 2) + "px";
      self.container.style.height = h + "px";
      self.canvasHeight = h;
      self.tracksScrollY = 0;
      self.tracksScrollThumbPos = 0;
      //self.save();
    }
    function mouseUp(e) {
      document.body.removeEventListener("mousemove", mouseMove, false);
      document.body.removeEventListener("mouseup", mouseUp, false);
    }
    document.body.addEventListener("mousemove", mouseMove, false);
    document.body.addEventListener("mouseup", mouseUp, false);
  },
    false);
  document.body.appendChild(this.splitter);

  this.canvas = document.createElement("canvas");
  this.c = this.canvas.getContext("2d");
  this.canvas.width = 0;
  this.container.appendChild(this.canvas);


  var self = this;
  this.zoomOnMouseWheelListener = function (event) {  event.preventDefault(); event.stopImmediatePropagation(); event.stopPropagation(); if (event.wheelDelta >= 0) { self.contextMenuZoomout(event); } else { self.contextMenuZoomin(event); } };
  this.defaultOnMouseWheelListener = function (event) { event.preventDefault(); event.stopImmediatePropagation(); event.stopPropagation(); if (event.wheelDelta >= 0) { self.scrollUp(event); } else { self.scrollDown(event); } };

  this.canvas.addEventListener('mousedown', function (event) { self.onMouseDown(event); }, false);
  this.canvas.addEventListener('mousewheel', this.zoomOnMouseWheelListener, false);
  this.canvas.addEventListener('mousemove', function (event) { self.onCanvasMouseMove(event); }, false);
  this.canvas.addEventListener('contextmenu', function (event) { self.onContextMenu(event); }, false);
  this.canvas.addEventListener('click', function (event) { self.onMouseClick(event); }, false);
  this.canvas.addEventListener('dblclick', function (event) { self.onDoubleMouseClick(event); }, false);

  document.body.addEventListener('click', function (event) { self.contextMenuHide() }, false);
  document.body.addEventListener('mousemove', function (event) { self.onDocumentMouseMove(event); }, false);
  // canvas context menu buttons
  document.getElementById("cm-start").addEventListener("click", function (event) { self.contextMenuSetStartTime(event); }, false);
  document.getElementById("cm-end").addEventListener("click", function (event) { self.contextMenuSetEndTime(event); }, false);
  document.getElementById("cm-mode").addEventListener("click", function (event) { self.contextMenuToggleMouseWheelMode(event); }, false);
  document.getElementById("cm-selection").addEventListener("click", function (event) { self.contextMenuToggleSelectionMode(event); }, false);
  document.getElementById("cm-delete").addEventListener("click", function (event) { self.contextMenuDeleteAnnotation(event); }, false);
  document.getElementById("cm-zoomin").addEventListener("click", function (event) { self.contextMenuZoomin(event); }, false);
  document.getElementById("cm-zoomout").addEventListener("click", function (event) { self.contextMenuZoomout(event); }, false);
  // annotation form buttons
  document.getElementById("af-cancel").addEventListener("click", function (event) { self.annotationFormCancel(event); }, false);
  document.getElementById("af-delete").addEventListener("click", function (event) { self.annotationFormDelete(event); }, false);
  document.getElementById("af-save").addEventListener("click", function (event) { self.annotationFormSave(event); }, false);
  // annotation form controllers buttons
  // Forward button
  document.getElementById("forward-btn").addEventListener("click", function () {
    self.pause()
    const stepSize = +document.getElementById("step-size").value;
    if (self.seekMode == SEEK_MODE_FRAMES) { self.videoFrameObject.seekForward(stepSize); }
    else { document.getElementById("video").currentTime += stepSize; }
  });
  // Backward button
  document.getElementById("backward-btn").addEventListener("click", function () {
    self.pause();
    const stepSize = +document.getElementById("step-size").value;
    if (self.seekMode == SEEK_MODE_FRAMES) { self.videoFrameObject.seekBackward(stepSize); }
    else { document.getElementById("video").currentTime -= stepSize; }
  });
  // Seek mode button
  document.getElementById("seek-mode-btn").addEventListener("click", function () {
    if (self.seekMode == SEEK_MODE_FRAMES) {
      self.seekMode = SEEK_MODE_SECONDS;
      document.getElementById("seek-mode-btn").innerHTML = "Seconds";
    }
    else {
      self.seekMode = SEEK_MODE_FRAMES;
      document.getElementById("seek-mode-btn").innerHTML = "Frames";
    }
  });
  // Playing mode button
  document.getElementById("play-mode-btn").addEventListener("click", function () {
    if (self.rangeMode == RANGE_MODE_PLAY_ALL) {
      self.rangeMode = RANGE_MODE_PLAY_SELECTED;
      document.getElementById("play-mode-btn").innerHTML = "Selected";
    } else {
      self.rangeMode = RANGE_MODE_PLAY_ALL;
      document.getElementById("play-mode-btn").innerHTML = "All";
    }
  });
  // Loop mode button
  document.getElementById("loop-mode-btn").addEventListener("click", function () {
    if (!self.loopMode) {
      self.loopMode = true;
      document.getElementById("loop-mode-btn").innerHTML = "On";
    } else {
      self.loopMode = false;
      document.getElementById("loop-mode-btn").innerHTML = "Off";
    }
  });
}

Timeline.prototype.updateGUI = function () {
  if (!this.canvas) {
    this.initGUI();
  }

  this.canvas.width = window.innerWidth;
  this.canvas.height = this.canvasHeight;
  var w = this.canvas.width;
  var h = this.canvas.height;

  this.tracksScrollHeight = this.canvas.height - this.headerHeight - this.timeScrollHeight;
  var totalTracksHeight = (this.tracks.length) * this.trackLabelHeight;
  // var totalTracksHeightLimit = this.headerHeight + this.trackLabelHeight * this.tracks.length;
  // if (totalTracksHeightLimit > this.canvas.height) {
  //   totalTracksHeight += this.tracksScrollHeight;
  // }
  var tracksScrollRatio = this.tracksScrollHeight / totalTracksHeight;
  this.tracksScrollThumbHeight = Math.min(Math.max(20, this.tracksScrollHeight * tracksScrollRatio), this.tracksScrollHeight);

  this.timeScrollWidth = this.canvas.width - this.trackLabelWidth - this.tracksScrollWidth;
  var animationEnd = this.findVideoDuration();
  var visibleTime = this.xToTime(this.canvas.width - this.trackLabelWidth - this.tracksScrollWidth) - this.xToTime(0); //100 to get some space after lask key
  var timeScrollRatio = Math.max(0, Math.min(visibleTime / animationEnd, 1));
  this.timeScrollThumbWidth = timeScrollRatio * this.timeScrollWidth;
  if (this.timeScrollThumbPos + this.timeScrollThumbWidth > this.timeScrollWidth) {
    this.timeScrollThumbPos = Math.max(0, this.timeScrollWidth - this.timeScrollThumbWidth);
  }


  this.c.clearRect(0, 0, w, h);


  // white background rect for the left side of the timeline
  this.drawRect(0, 0, this.trackLabelWidth, h, "#EEEEEE");


  for (var i = 0; i < this.tracks.length; i++) {
    var totalTracksHeightLimit = this.headerHeight + this.trackLabelHeight * (i + 1);
    var scrollY = this.tracksScrollY * ((this.tracks.length + 1) * this.trackLabelHeight - this.canvas.height + this.headerHeight);
    totalTracksHeightLimit -= scrollY;
    if (totalTracksHeightLimit < this.headerHeight) continue;
    this.drawTrack(this.tracks[i], totalTracksHeightLimit);
  }

  //timeline
  var timelineStart = 0;
  var timelineEnd = this.endTime;
  var lastTimeLabelX = 0;

  // clear background for it
  this.drawRect(0, 0, this.canvas.width, this.headerHeight, "#EEEEEE");

  this.c.fillStyle = "#666666";
  var x = this.timeToX(0);
  for (var sec = timelineStart; sec < timelineEnd; sec++) {
    //var sec = timelineStart;
    //while(x < this.canvas.width) {  
    x = this.timeToX(sec);
    this.drawLine(x, 0, x, this.headerHeight * 0.3, "#999999");

    var minutes = Math.floor(sec / 60);
    var seconds = sec % 60;
    var time = minutes + ":" + ((seconds < 10) ? "0" : "") + seconds;

    if (x - lastTimeLabelX > 30) {
      this.c.fillText(time, x - 6, this.headerHeight * 0.8);
      lastTimeLabelX = x;
    }
    sec += 1;
  }

  //time ticker
  // draw time ticker if it is not overlaping with the left side of the timeline
  if (this.timeToX(this.time) > this.trackLabelWidth) {
    this.drawLine(this.timeToX(this.time), 0, this.timeToX(this.time), h, "#FF0000");
  }


  // clear background for it
  this.drawRect(0, h - this.timeScrollHeight, this.canvas.width, h, "#EEEEEE");

  //time scale
  for (var i = 2; i < 20; i++) {
    var f = 1.0 - (i * i) / 361;
    this.drawLine(7 + f * (this.trackLabelWidth - 10), h - this.timeScrollHeight + 4, 7 + f * (this.trackLabelWidth - 10), h - 3, "#999999");
  }

  this.c.fillStyle = "#666666";
  this.c.beginPath();
  this.c.moveTo(7 + (1.0 - this.timeScale) * (this.trackLabelWidth - 10), h - 7);
  this.c.lineTo(11 + (1.0 - this.timeScale) * (this.trackLabelWidth - 10), h - 1);
  this.c.lineTo(3 + (1.0 - this.timeScale) * (this.trackLabelWidth - 10), h - 1);
  this.c.fill();

  //tracks scrollbar
  this.drawRect(this.canvas.width - this.tracksScrollWidth, this.headerHeight + 1, this.tracksScrollWidth, this.tracksScrollHeight, "#DDDDDD");
  if (this.tracksScrollThumbHeight < this.tracksScrollHeight) {
    this.drawRect(this.canvas.width - this.tracksScrollWidth, this.headerHeight + 1 + this.tracksScrollThumbPos, this.tracksScrollWidth, this.tracksScrollThumbHeight, "#999999");
  }

  //time scrollbar
  this.drawRect(this.trackLabelWidth, h - this.timeScrollHeight, w - this.trackLabelWidth - this.tracksScrollWidth, this.timeScrollHeight, "#DDDDDD");
  if (this.timeScrollThumbWidth < this.timeScrollWidth) {
    this.drawRect(this.trackLabelWidth + 1 + this.timeScrollThumbPos, h - this.timeScrollHeight, this.timeScrollThumbWidth, this.timeScrollHeight, "#999999");
  }

  //header borders
  this.drawLine(0, 0, w, 0, "#000000");
  this.drawLine(0, this.headerHeight, w, this.headerHeight, "#000000");
  this.drawLine(0, h - this.timeScrollHeight, this.trackLabelWidth, h - this.timeScrollHeight, "#000000");
  this.drawLine(this.trackLabelWidth, h - this.timeScrollHeight - 1, this.trackLabelWidth, h, "#000000");


  //buttons  
  this.drawRect(0 * this.headerHeight - 4 * -1, 5, this.headerHeight - 8, this.headerHeight - 8, "#DDDDDD");
  this.drawRect(1 * this.headerHeight - 4 * 0, 5, this.headerHeight - 8, this.headerHeight - 8, "#DDDDDD");
  this.drawRect(2 * this.headerHeight - 4 * 1, 5, this.headerHeight - 8, this.headerHeight - 8, "#DDDDDD");
  this.drawRect(3 * this.headerHeight - 4 * 2, 5, this.headerHeight - 8, this.headerHeight - 8, "#DDDDDD");

  //play
  this.c.strokeStyle = this.playing ? "#000000" : "#000000";
  this.c.beginPath();
  this.c.moveTo(4 + 6.5, 5 + 5);
  this.c.lineTo(this.headerHeight - 8, this.headerHeight / 2 + 1.5);
  this.c.lineTo(4 + 6.5, this.headerHeight - 8);
  this.c.lineTo(4 + 6.5, 5 + 5);
  this.c.stroke();
  this.c.strokeStyle = "#000000";
  //pause  
  this.c.strokeRect(this.headerHeight + 5.5, 5 + 5.5, this.headerHeight / 6, this.headerHeight - 8 - 11);
  this.c.strokeRect(this.headerHeight + 5.5 + this.headerHeight / 6 + 2, 5 + 5.5, this.headerHeight / 6, this.headerHeight - 8 - 11);

  //stop    
  this.c.strokeRect(2 * this.headerHeight - 4 + 5.5, 5 + 5.5, this.headerHeight - 8 - 11, this.headerHeight - 8 - 11);

  //export
  this.c.beginPath();
  this.c.moveTo(3 * this.headerHeight - 4 * 2 + 5.5, this.headerHeight - 9.5);
  this.c.lineTo(3 * this.headerHeight - 4 * 2 + 11.5, this.headerHeight - 9.5);
  this.c.moveTo(3 * this.headerHeight - 4 * 2 + 5.5, this.headerHeight - 13.5);
  this.c.lineTo(3 * this.headerHeight - 4 * 2 + 13.5, this.headerHeight - 13.5);
  this.c.moveTo(3 * this.headerHeight - 4 * 2 + 5.5, this.headerHeight - 17.5);
  this.c.lineTo(3 * this.headerHeight - 4 * 2 + 15.5, this.headerHeight - 17.5);
  this.c.stroke();

  //tracks area clipping path
  this.c.save();
  this.c.beginPath();
  this.c.moveTo(0, this.headerHeight + 1);
  this.c.lineTo(this.canvas.width, this.headerHeight + 1);
  this.c.lineTo(this.canvas.width, this.canvas.height - this.timeScrollHeight);
  this.c.lineTo(0, this.canvas.height - this.timeScrollHeight);
  this.c.clip();

  this.c.restore();

  //end of label panel
  this.drawLine(this.trackLabelWidth, 0, this.trackLabelWidth, h, "#000000");

}

//    ________      ________ _   _ _______ _____ 
//   |  ____\ \    / /  ____| \ | |__   __/ ____|
//   | |__   \ \  / /| |__  |  \| |  | | | (___  
//   |  __|   \ \/ / |  __| | . ` |  | |  \___ \ 
//   | |____   \  /  | |____| |\  |  | |  ____) |
//   |______|   \/   |______|_| \_|  |_| |_____/ 
//                                               
//                                               

Timeline.prototype.scrollUp = function (event) {
  this.tracksScrollThumbPos -= this.tracksScrollHeight * .1;
  if (this.tracksScrollThumbPos < 0) {
    this.tracksScrollThumbPos = 0;
  }
  this.tracksScrollThumbPos = Math.round(this.tracksScrollThumbPos);
  if (this.tracksScrollHeight - this.tracksScrollThumbHeight > 0) {
    this.tracksScrollY = this.tracksScrollThumbPos / (this.tracksScrollHeight - this.tracksScrollThumbHeight);
  }
  else {
    this.tracksScrollY = 0;
  }
  this.update();
}

Timeline.prototype.scrollDown = function (event) {
  this.tracksScrollThumbPos += this.tracksScrollHeight * .1;
  if (this.tracksScrollThumbPos > this.tracksScrollHeight - this.tracksScrollThumbHeight) {
    this.tracksScrollThumbPos = this.tracksScrollHeight - this.tracksScrollThumbHeight;
  }
  this.tracksScrollThumbPos = Math.round(this.tracksScrollThumbPos);
  if (this.tracksScrollHeight - this.tracksScrollThumbHeight > 0) {
    this.tracksScrollY = this.tracksScrollThumbPos / (this.tracksScrollHeight - this.tracksScrollThumbHeight);
  }
  else {
    this.tracksScrollY = 0;
  }
  this.update();
}

Timeline.prototype.onMouseDown = function (event) {
  if (event.button) { return; }
  this.selectedKeys = [];

  var x = event.layerX;
  var y = event.layerY;
  //TOP TIMELINE (HEADER with minutes/seconds)
  if (x > this.trackLabelWidth && y < this.headerHeight) { //right of track selected, within header

    this.draggingTime = true;
    this.onDocumentMouseMove(event);

  }
  //VERTICAL SCROLL BAR        
  else if (x > this.canvas.width - this.tracksScrollWidth && y > this.headerHeight) {

    if (y >= this.headerHeight + this.tracksScrollThumbPos && y <= this.headerHeight + this.tracksScrollThumbPos + this.tracksScrollThumbHeight) {
      this.tracksScrollThumbDragOffset = y - this.headerHeight - this.tracksScrollThumbPos;
      this.draggingTracksScrollThumb = true;
    }
  }
  //TRACK SELECTOR (far LEFT)
  else if (y > this.headerHeight && y < this.canvasHeight - this.timeScrollHeight) { //x > this.trackLabelWidth && 
    //keys
    // this.selectKeys(event.layerX, event.layerY); //TODO adding and dragging animations
    // if (this.selectedKeys.length > 0) {
    //   this.draggingKeys = true;
    // }       
    // this.cancelKeyClick = false;

    //change selected camera based on selected track
    var selectedTrack = this.getTrackAt(event.layerX, event.layerY);
    this.changeTrack(selectedTrack);
    var selectedAnnotation = this.getAnnotationAt(event.layerX, event.layerY);
    if (selectedAnnotation != null)
      this.currentAnnotationIndex = selectedAnnotation;
    else
      this.currentAnnotationIndex = -1;
  }
  //TIME SCALE (bottom left)
  else if (x < this.trackLabelWidth && y > this.canvasHeight - this.timeScrollHeight) {
    this.timeScale = Math.max(0.01, Math.min((this.trackLabelWidth - x) / this.trackLabelWidth, 1));
    this.draggingTimeScale = true;
  }
  //HORIZONTAL SCROLL BAR
  else if (x > this.trackLabelWidth && y > this.canvasHeight - this.timeScrollHeight) {
    if (x >= this.trackLabelWidth + this.timeScrollThumbPos && x <= this.trackLabelWidth + this.timeScrollThumbPos + this.timeScrollThumbWidth) {
      this.timeScrollThumbDragOffset = x - this.trackLabelWidth - this.timeScrollThumbPos;
      this.draggingTimeScrollThumb = true;
    }
  }
}

Timeline.prototype.onCanvasMouseMove = function (event) {
  var x = event.layerX;
  var y = event.layerY;

  if (this.draggingTracksScrollThumb) {
    this.tracksScrollThumbPos = y - this.headerHeight - this.tracksScrollThumbDragOffset;
    if (this.tracksScrollThumbPos < 0) {
      this.tracksScrollThumbPos = 0;
    }
    if (this.tracksScrollThumbPos + this.tracksScrollThumbHeight > this.tracksScrollHeight) {
      this.tracksScrollThumbPos = Math.max(0, this.tracksScrollHeight - this.tracksScrollThumbHeight);
    }
    if (this.tracksScrollHeight - this.tracksScrollThumbHeight > 0) {
      this.tracksScrollY = this.tracksScrollThumbPos / (this.tracksScrollHeight - this.tracksScrollThumbHeight);
    }
    else {
      this.tracksScrollY = 0;
    }
  }
  if (this.draggingTimeScrollThumb) {
    this.timeScrollThumbPos = x - this.trackLabelWidth - this.timeScrollThumbDragOffset;
    if (this.timeScrollThumbPos < 0) {
      this.timeScrollThumbPos = 0;
    }
    if (this.timeScrollThumbPos + this.timeScrollThumbWidth > this.timeScrollWidth) {
      this.timeScrollThumbPos = Math.max(0, this.timeScrollWidth - this.timeScrollThumbWidth);
    }
    if (this.timeScrollWidth - this.timeScrollThumbWidth > 0) {
      this.timeScrollX = this.timeScrollThumbPos / (this.timeScrollWidth - this.timeScrollThumbWidth);
    }
    else {
      this.timeScrollX = 0;
    }
  }
}

Timeline.prototype.onDocumentMouseMove = function (event) {
  var x = event.layerX;
  var y = event.layerY;

  if (this.draggingTime) {
    this.time = this.xToTime(x);
    var animationEnd = this.findVideoDuration();
    if (this.time < 0) this.time = 0;
    if (this.time > animationEnd) this.time = animationEnd;
    this.prevTime = this.time - FRAME_DELTA;
    document.getElementById(this.videoId).currentTime = this.time;
  }
  if (this.draggingKeys) {
    for (var i = 0; i < this.selectedKeys.length; i++) {
      var draggedKey = this.selectedKeys[i];
      draggedKey.time = Math.max(0, this.xToTime(x));
      this.sortTrackKeys(draggedKey.track);
      this.rebuildSelectedTracks();
    }
    this.cancelKeyClick = true;
    this.timeScrollThumbPos = this.timeScrollX * (this.timeScrollWidth - this.timeScrollThumbWidth);
  }

  if (this.draggingTimeScale) {
    this.timeScale = Math.max(0.01, Math.min((this.trackLabelWidth - x) / this.trackLabelWidth, 1));
  }
}



Timeline.prototype.onMouseUp = function (event) {
  if (this.draggingTime) {
    this.draggingTime = false;
  }
  if (this.draggingKeys) {
    this.draggingKeys = false;
  }
  if (this.draggingTracksScrollThumb) {
    this.draggingTracksScrollThumb = false;
  }
  if (this.draggingTimeScale) {
    this.draggingTimeScale = false;
  }
  if (this.draggingTimeScrollThumb) {
    this.draggingTimeScrollThumb = false;
  }
}

Timeline.prototype.onMouseClick = function (event) {
  // console.log('CLICK.' + event.button, event);
  this.contextMenuHide();
  if (event.layerX < 1 * this.headerHeight - 4 * 0 && event.layerY < this.headerHeight) {
    this.play();
  }
  if (event.layerX > 1 * this.headerHeight - 4 * 0 && event.layerX < 2 * this.headerHeight - 4 * 1 && event.layerY < this.headerHeight) {
    this.pause();
  }

  if (event.layerX > 2 * this.headerHeight - 4 * 1 && event.layerX < 3 * this.headerHeight - 4 * 2 && event.layerY < this.headerHeight) {
    this.stop();
  }

  if (event.layerX > 3 * this.headerHeight - 4 * 2 && event.layerX < 4 * this.headerHeight - 4 * 3 && event.layerY < this.headerHeight) {
    this.clickedTrackIndex = -1;
    this.currentAnnotationIndex = -1;
    this.annotationFormLoad();
  }

  // horizontal scroll bar handler
  if (!this.draggingTimeScrollThumb && event.layerX > this.trackLabelWidth && event.layerY > this.canvasHeight - this.timeScrollHeight) {
    this.timeScrollThumbPos = event.layerX - this.trackLabelWidth;
    if (this.timeScrollThumbPos < 0) {
      this.timeScrollThumbPos = 0;
    }
    if (this.timeScrollThumbPos + this.timeScrollThumbWidth > this.timeScrollWidth) {
      this.timeScrollThumbPos = Math.max(0, this.timeScrollWidth - this.timeScrollThumbWidth);
    }
    if (this.timeScrollWidth - this.timeScrollThumbWidth > 0) {
      this.timeScrollX = this.timeScrollThumbPos / (this.timeScrollWidth - this.timeScrollThumbWidth);
    }
    else {
      this.timeScrollX = 0;
    }
  }


  // vertical scroll bar handler
  if (!this.draggingTracksScrollThumb && event.layerX > this.canvas.width - this.tracksScrollWidth && event.layerY > this.headerHeight && event.layerY < this.canvasHeight - this.timeScrollHeight) {
    this.tracksScrollThumbPos = event.layerY - this.headerHeight;
    if (this.tracksScrollThumbPos < 0) {
      this.tracksScrollThumbPos = 0;
    }
    if (this.tracksScrollThumbPos + this.tracksScrollThumbHeight > this.tracksScrollHeight) {
      this.tracksScrollThumbPos = Math.max(0, this.tracksScrollHeight - this.tracksScrollThumbHeight);
    }
    if (this.tracksScrollHeight - this.tracksScrollThumbHeight > 0) {
      this.tracksScrollY = this.tracksScrollThumbPos / (this.tracksScrollHeight - this.tracksScrollThumbHeight);
    }
    else {
      this.tracksScrollY = 0;
    }
  }
  if (this.draggingTime) {
    this.draggingTime = false;
  }
  if (this.draggingKeys) {
    this.draggingKeys = false;
  }
  if (this.draggingTracksScrollThumb) {
    this.draggingTracksScrollThumb = false;
  }
  if (this.draggingTimeScale) {
    this.draggingTimeScale = false;
  }
  if (this.draggingTimeScrollThumb) {
    this.draggingTimeScrollThumb = false;
  }
}

Timeline.prototype.onDoubleMouseClick = function (event) {
  // check if the click is on the scroll bar area
  // scroll to this place
  if (event.layerX > this.trackLabelWidth && event.layerY > this.canvasHeight - this.timeScrollHeight) {
    this.timeScrollThumbPos = event.layerX - this.trackLabelWidth;
    if (this.timeScrollThumbPos < 0) {
      this.timeScrollThumbPos = 0;
    }
    if (this.timeScrollThumbPos + this.timeScrollThumbWidth > this.timeScrollWidth) {
      this.timeScrollThumbPos = Math.max(0, this.timeScrollWidth - this.timeScrollThumbWidth);
    }
    if (this.timeScrollWidth - this.timeScrollThumbWidth > 0) {
      this.timeScrollX = this.timeScrollThumbPos / (this.timeScrollWidth - this.timeScrollThumbWidth);
    }
    else {
      this.timeScrollX = 0;
    }
  }

}


//    _____  _____       __          _______ _   _  _____ 
//   |  __ \|  __ \     /\ \        / /_   _| \ | |/ ____|
//   | |  | | |__) |   /  \ \  /\  / /  | | |  \| | |  __ 
//   | |  | |  _  /   / /\ \ \/  \/ /   | | | . ` | | |_ |
//   | |__| | | \ \  / ____ \  /\  /   _| |_| |\  | |__| |
//   |_____/|_|  \_\/_/    \_\/  \/   |_____|_| \_|\_____|
//                                                        
//                                                        

Timeline.prototype.drawTrack = function (track, y) {

  //bottom track line
  this.drawLine(0, y, this.canvas.width, y, "#FFFFFF");

  var onTopAnnotation = undefined;

  // draw annotations (texts) on the track
  for (var i = 0; i < track?.annotations?.length; i++) {
    if (this.hideTracksOnSelection && this.currentAnnotationIndex !== -1 && this.currentAnnotationIndex !== i && this.clickedTrackIndex == track.index) {
      continue;
    }
    var annotation = track.annotations[i];
    this.drawAnnotaion(track, annotation, y, i);
  }

  var xshift = 5;

  //object track header background
  if (this.currentTrackIndex == track.index)
    this.drawRect(0, y - this.trackLabelHeight, this.trackLabelWidth, this.trackLabelHeight + 2, "#88FFFF");
  else
    this.drawRect(0, y - this.trackLabelHeight, this.trackLabelWidth, this.trackLabelHeight + 2, "#FFFFFF");
  //label color
  this.c.fillStyle = "#000000";
  this.drawLine(0, y - this.trackLabelHeight, this.trackLabelWidth, y - this.trackLabelHeight, "#BBBBBB");

  this.c.fillStyle = "black";
  this.c.font = "12px Arial";
  //draw track label
  this.c.fillText(track.name, xshift, y - this.trackLabelHeight / 4);

}

Timeline.prototype.drawAnnotaion = function (track, annotation, y, i) {
  var startX = this.timeToX(annotation.startTime);
  var endX = this.timeToX(annotation.endTime);
  var textHeight = (this.trackLabelHeight / 2);
  var textY = y - this.trackLabelHeight / 2;
  this.drawRect(startX, textY, endX - startX, textHeight * 1.2, "#ffffff");
  this.c.fillStyle = "black";
  this.c.font = "12px Arial";
  var textWidth = this.c.measureText(annotation.text).width;
  if (startX + textWidth > endX) {
    this.c.fillText(annotation.text, startX, textY + textHeight, endX - startX);
  } else {
    this.c.fillText(annotation.text, startX + (endX - startX - textWidth) / 2, textY + textHeight);
  }
  textHeight = textHeight * 1.2
  this.drawLine(startX, textY, startX, textY + textHeight, "red");
  this.drawLine(endX, textY, endX, textY + textHeight, "red");
  if (this.currentAnnotationIndex == i && this.clickedTrackIndex == track.index) {
    this.drawLine(startX, textY, endX, textY, "red");
    this.drawLine(startX, textY + textHeight, endX, textY + textHeight, "red");
    if (this.loadedAnnotationIndex !== i || this.loadedAnnotationTrackIndex !== track.index) {
      this.annotationFormLoad(this.clickedTrackIndex, i);
      this.loadedAnnotationIndex = i;
      this.loadedAnnotationTrackIndex = this.clickedTrackIndex;
    }
  }
}

Timeline.prototype.drawLine = function (x1, y1, x2, y2, color) {
  this.c.strokeStyle = color;
  this.c.beginPath();
  this.c.moveTo(x1 + 0.5, y1 + 0.5);
  this.c.lineTo(x2 + 0.5, y2 + 0.5);
  this.c.stroke();
}

Timeline.prototype.drawRect = function (x, y, w, h, color) {
  this.c.fillStyle = color;
  this.c.fillRect(x, y, w, h);
}

Timeline.prototype.drawCenteredRect = function (x, y, w, h, color) {
  this.c.fillStyle = color;
  this.c.fillRect(x - w / 2, y - h / 2, w, h);
}

Timeline.prototype.drawRombus = function (x, y, w, h, color, drawLeft, drawRight, strokeColor) {
  this.c.fillStyle = color;
  if (strokeColor) {
    this.c.lineWidth = 2;
    this.c.strokeStyle = strokeColor;
    this.c.beginPath();
    this.c.moveTo(x, y - h / 2);
    this.c.lineTo(x + w / 2, y);
    this.c.lineTo(x, y + h / 2);
    this.c.lineTo(x - w / 2, y);
    this.c.lineTo(x, y - h / 2);
    this.c.stroke();
    this.c.lineWidth = 1;
  }

  if (drawLeft) {
    this.c.beginPath();
    this.c.moveTo(x, y - h / 2);
    this.c.lineTo(x - w / 2, y);
    this.c.lineTo(x, y + h / 2);
    this.c.fill();
  }

  if (drawRight) {
    this.c.beginPath();
    this.c.moveTo(x, y - h / 2);
    this.c.lineTo(x + w / 2, y);
    this.c.lineTo(x, y + h / 2);
    this.c.fill();
  }
}


function colourNameToHex(colour) {
  var colours = {
    "aliceblue": "#f0f8ff", "antiquewhite": "#faebd7", "aqua": "#00ffff", "aquamarine": "#7fffd4", "azure": "#f0ffff",
    "beige": "#f5f5dc", "bisque": "#ffe4c4", "black": "#000000", "blanchedalmond": "#ffebcd", "blue": "#0000ff", "blueviolet": "#8a2be2", "brown": "#a52a2a", "burlywood": "#deb887",
    "cadetblue": "#5f9ea0", "chartreuse": "#7fff00", "chocolate": "#d2691e", "coral": "#ff7f50", "cornflowerblue": "#6495ed", "cornsilk": "#fff8dc", "crimson": "#dc143c", "cyan": "#00ffff",
    "darkblue": "#00008b", "darkcyan": "#008b8b", "darkgoldenrod": "#b8860b", "darkgray": "#a9a9a9", "darkgreen": "#006400", "darkkhaki": "#bdb76b", "darkmagenta": "#8b008b", "darkolivegreen": "#556b2f",
    "darkorange": "#ff8c00", "darkorchid": "#9932cc", "darkred": "#8b0000", "darksalmon": "#e9967a", "darkseagreen": "#8fbc8f", "darkslateblue": "#483d8b", "darkslategray": "#2f4f4f", "darkturquoise": "#00ced1",
    "darkviolet": "#9400d3", "deeppink": "#ff1493", "deepskyblue": "#00bfff", "dimgray": "#696969", "dodgerblue": "#1e90ff",
    "firebrick": "#b22222", "floralwhite": "#fffaf0", "forestgreen": "#228b22", "fuchsia": "#ff00ff",
    "gainsboro": "#dcdcdc", "ghostwhite": "#f8f8ff", "gold": "#ffd700", "goldenrod": "#daa520", "gray": "#808080", "green": "#008000", "greenyellow": "#adff2f",
    "honeydew": "#f0fff0", "hotpink": "#ff69b4",
    "indianred ": "#cd5c5c", "indigo": "#4b0082", "ivory": "#fffff0", "khaki": "#f0e68c",
    "lavender": "#e6e6fa", "lavenderblush": "#fff0f5", "lawngreen": "#7cfc00", "lemonchiffon": "#fffacd", "lightblue": "#add8e6", "lightcoral": "#f08080", "lightcyan": "#e0ffff", "lightgoldenrodyellow": "#fafad2",
    "lightgrey": "#d3d3d3", "lightgreen": "#90ee90", "lightpink": "#ffb6c1", "lightsalmon": "#ffa07a", "lightseagreen": "#20b2aa", "lightskyblue": "#87cefa", "lightslategray": "#778899", "lightsteelblue": "#b0c4de",
    "lightyellow": "#ffffe0", "lime": "#00ff00", "limegreen": "#32cd32", "linen": "#faf0e6",
    "magenta": "#ff00ff", "maroon": "#800000", "mediumaquamarine": "#66cdaa", "mediumblue": "#0000cd", "mediumorchid": "#ba55d3", "mediumpurple": "#9370d8", "mediumseagreen": "#3cb371", "mediumslateblue": "#7b68ee",
    "mediumspringgreen": "#00fa9a", "mediumturquoise": "#48d1cc", "mediumvioletred": "#c71585", "midnightblue": "#191970", "mintcream": "#f5fffa", "mistyrose": "#ffe4e1", "moccasin": "#ffe4b5",
    "navajowhite": "#ffdead", "navy": "#000080",
    "oldlace": "#fdf5e6", "olive": "#808000", "olivedrab": "#6b8e23", "orange": "#ffa500", "orangered": "#ff4500", "orchid": "#da70d6",
    "palegoldenrod": "#eee8aa", "palegreen": "#98fb98", "paleturquoise": "#afeeee", "palevioletred": "#d87093", "papayawhip": "#ffefd5", "peachpuff": "#ffdab9", "peru": "#cd853f", "pink": "#ffc0cb", "plum": "#dda0dd", "powderblue": "#b0e0e6", "purple": "#800080",
    "rebeccapurple": "#663399", "red": "#ff0000", "rosybrown": "#bc8f8f", "royalblue": "#4169e1",
    "saddlebrown": "#8b4513", "salmon": "#fa8072", "sandybrown": "#f4a460", "seagreen": "#2e8b57", "seashell": "#fff5ee", "sienna": "#a0522d", "silver": "#c0c0c0", "skyblue": "#87ceeb", "slateblue": "#6a5acd", "slategray": "#708090", "snow": "#fffafa", "springgreen": "#00ff7f", "steelblue": "#4682b4",
    "tan": "#d2b48c", "teal": "#008080", "thistle": "#d8bfd8", "tomato": "#ff6347", "turquoise": "#40e0d0",
    "violet": "#ee82ee",
    "wheat": "#f5deb3", "white": "#ffffff", "whitesmoke": "#f5f5f5",
    "yellow": "#ffff00", "yellowgreen": "#9acd32"
  };

  if (typeof colours[colour.toLowerCase()] != 'undefined')
    return colours[colour.toLowerCase()];

  return colour;
}





// ------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------
// Constants

const FRAME_DELTA = 1 / 30;

const LOOP_MODE_ONCE = 0;
const LOOP_MODE_LOOP = 1;

const RANGE_MODE_PLAY_ALL = 0;
const RANGE_MODE_PLAY_SELECTED = 1;

const SEEK_MODE_FRAMES = 0;
const SEEK_MODE_SECONDS = 1;

const REPLAYING_DELAY = 0.1;