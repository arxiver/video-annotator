# video-annotator
[Live preview](https://rrrokhtar.github.io/video-annotator/)

Video annotation portable web app (A canvas based timeline for controlling and annotating video)

This app is a part of [RapidAnnotator](https://github.com/RedHenLab/RapidAnnotator-2.0) (GSoC'22 project) and it is an extending work on [videotimeline.js](https://github.com/AlunAlun/videotimeline.js)

Features:
- Timeline
- Frame/Seconds seeking
- Zoom in/out video timeline
- Annotation add/edit/delete
- Multiple tracks support

Usage:
```js
// singltone object
var videoId = "video"
var timeline = new Timeline(videoId); 
// add intial tracks and their annotation (load)
timeline.addTrack(3, "track 03", [{
		text: "text dsadasdasd",
		backgroundColor: "white",
		startTime: 0,
		endTime: 10.5,
	}]);
// add track without annotations (empty list)
timeline.addTrack(2, "track 02", []);
```

![image](https://user-images.githubusercontent.com/39674365/187510942-7143c583-8f1b-4aab-a00b-ab5c42ca0531.png)
