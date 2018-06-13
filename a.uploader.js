///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// a.uploader: my own uploader class
// 		by alantypoon 20161024
// Description:
//	A jQuery plugin to upload file with a progress dialog. Each instance contain its own object instances of resumable and progressbar
//	It may pause, resume, cancel and a progress with percentage is shown
//
// Public methods:
//  - called by jimg.uploader('loadGallery');
//
// References
//  - http://learn.jquery.com/plugins/stateful-plugins-with-widget-factory/
//  - http://stackoverflow.com/questions/1117086/how-to-create-a-jquery-plugin-with-methods
//	- http://resumablejs.com/
//	- https://kimmobrunfeldt.github.io/progressbar.js/
//  - https://blueimp.github.io/jQuery-File-Upload/ (not needed)
//	- http://stackoverflow.com/questions/7687984/jquery-widget-factory-can-i-declare-global-variables-at-create-or-outside-the
//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


$.widget( "a.uploader", {
	options: {
		element:						null,
		target: 						null,
		upload_query: 			[],
		gallery: 						null,
		maxThumbNailSize: 	150,
		progressBarSize: 		80,
		progressBarColor1: 	'AliceBlue',
		progressBarColor2: 	'ForestGreen',
		progressBarSize:		14,
		mediaFolder: 				getMediaFolder(),
		media_arr: 					[],
		trash: 							1,
		onUpdate:						0,
		debugLvl:						1,	// 0=off, 1=console.log, 2=console.log, 2=alert
		onLoad:							0,
		parentClass:				0,
		allowtext:					1,
		onUploaderSuccess:	0,
	},
	vars: {
		//browser: {
		//	isOpera: !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0,											// Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
		//	isFirefox: typeof InstallTrigger !== 'undefined',   																			// Firefox 1.0+
		//	isSafari: Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0,	// At least Safari 3+: "[object HTMLElementConstructor]"
		//	isChrome: !!window.chrome && !(!!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0),              																			// Chrome 1+
		//	isIE: /*@cc_on!@*/false || !!document.documentMode,
		//	isEdge: !(/*@cc_on!@*/false || !!document.documentMode) && !!window.StyleMedia,	 																									// Edge 20+
		//},
		added: 0,
		jdiv: 0,
		r: 0,	// resumable
	},

	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// create
	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	_create: function(){
		var
			self1 = this,
			el = self1.element,	// a single element (a collection break down)
			opts = self1.options,
			ishidden = el.css('display') == 'none'
		;
		// uploader button
		el.addClass('uploader_init');
		opts.element = el;

		// gallery
		if (opts.gallery){
			opts.gallery.addClass('uploader_gallery');
		} //else {
			// for display lightbox only
			//console.info('no gallery');
		//}

		// CHECK IF IT IS INPUT[TYPE=FILE] or just a readable
		if (el.prop("tagName") != 'INPUT' || el.attr('type').toUpperCase() != 'FILE'){

			// ERROR
			if (!opts.media_arr || !opts.media_arr.length){
				//console.error('no input button associated.');
			}
			opts.trash = 0;

		} else {

			// CREATE UNIQUE ID
			//console.log(el, opt);
			el.uniqueId().hide();
			var
				uid = el.attr('id'),
				jlabel = $('<label for="' + uid + '" class="uploader_label">' + el.attr('data-title') + '</label>')
			;
			el
				.attr('uid', uid)
				.after(jlabel)
			;
			if (ishidden){
				jlabel.hide();
			}
			opts.uid = uid;

			// DEBUG
			console.log('uploader created', uid);//, this.vars.browser);

			////////////////////////////////////////////////
			// CREATE RESUMABLE
			////////////////////////////////////////////////
			self1.createResumable(opts);

			self1.options.onLoad && self1.options.onLoad(uid);
		}

		///////////////////////////////////////////////////////////////////////////////////////////////////////

		//if (self1.options.media_arr && self1.options.media_arr.length > 0){
		//	self1.loadGallery(self1.options.media_arr);
		//}
	},

	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	_setOption: function( key, value ) {
		this.options[ key ] = value;
		this._update();
	},

	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	_update: function() {
	},

	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	_destroy: function(){
		console.log('_destroy');
		// remove resumable
		if (this.vars.r){
			delete this.vars.r;
			this.vars.r = 0;
		}
		//this.multiselect.remove();
	},

	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// private methods
	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// http://voice.firefallpro.com/2012/03/html5-audio-video-mime-types.html
	// http://help.encoding.com/knowledge-base/article/correct-mime-types-for-serving-video-files/
	_mime2cat: function(mime){
		var cat = '';
		if (mime){
			var arr = mime.split('/');
			if (arr.length == 2){
				var mimetype = arr[1].toLowerCase();
				// get extension from mime type e.g. "application/pdf"
				switch (mimetype){

					case 'gif':	case 'png':	case 'jpg':	case 'jpeg': case 'bmp': case 'x-ms-bmp':
						cat = 'image';
						break;

					case 'mp4':	case 'x-mpegURL': case 'MP2T':	case '3gpp': case 'quicktime': case 'x-msvideo': case 'x-ms-wmv': case 'ogg':
						cat = 'video';
						break;

					case 'ogg': case 'flac': case 'aac':	case 'm4a':	case 'wav': case 'mp3':
						cat = 'audio';
						break;

					case 'pdf':
						cat = 'pdf';
						break;

					case 'plain':
					case 'vnd.ms-excel':
					case 'csv':
						if (this.options.allowtext){
							cat = 'text';
						}
						break;
				}
			}
		}
		return cat;
	},

	////////////////////////////////////////////////////////////
	// addProgressBar
	////////////////////////////////////////////////////////////
	_addProgressBar: function(robj, file, jdiv, w, h){
		//console.log('_addProgressBar', robj.uid, file.uniqueIdentifier);
		////////////////////////////////////////////////////////////
		// ADD PROGRESS
		// https://kimmobrunfeldt.github.io/progressbar.js/
		////////////////////////////////////////////////////////////
		var	self1 = this;	// a.uploader

		//self1._dlog('_addProgressBar: file=' + file);

		// add opacity to the image or video
		var jobj = jdiv.find(':first-child');
		jobj.css('opacity', .3);

		// ADD PROGRESSBAR (EACH FILE HAS 1 PROGRESSBAR)
		file.pbar = new ProgressBar.Circle(jdiv[0], {
			//color: 'black',
			trailColor: self1.options.progressBarColor1,
			color: self1.options.progressBarColor2,
			strokeWidth: 5,
			trailWidth: 5,
			duration: 1500,
			text:{ value: ''},
			step: function(state, bar){
				if (self1.vars.p){
					if (state.color){
						self1.vars.p.path.setAttribute('stroke', state.color);
						//bar.setText('');
					} else {
						self1.vars.p.path.setAttribute('stroke', self1.options.progressBarColor2);
						//bar.setText((bar.value() * 100).toFixed(0) + '%');
					}
				}
			}
		});

		// POSITION THE BAR
		var size = parseInt(self1.options.progressBarSize);
		var svg = jdiv.find('svg').width(size).height(size);

		//////////////////////////////////////////////////////////
		// UPLOAD TO THE SERVER
		//////////////////////////////////////////////////////////
		if (self1.options.target){
			// upload after all pbar are created
			var	selected = robj.files.length;
			++robj.added;
			console.log('check uploading..', robj.added + '/' + selected);
			if (robj.added == selected)
			{
				robj.upload();
			}
		}
	},

	/////////////////////////////////////////////////////////////////////////////////

	_resetHighlight: function(hovering){
		//console.log('_resetHighlight', hovering);
		var color_default = '#e0e0e0';
		$('img.uploader_image, video.uploader_video')
			.css({
				//borderColor: color_default,
				borderTopColor: color_default,
				borderBottomColor: color_default,
				borderLeftColor: color_default,
				borderRightColor: color_default,
			})
			.attr('hovering', hovering)
		;
	},

	////////////////////////////////////////////////////////////////////////////////////////

	_callOnUpdate: function(){
		var self1 = this;
		if (self1.options.onUpdate){
			var media_arr = self1.getMediaArr();
			var media_id_arr = self1.getMediaIDArr();
			self1.options.onUpdate(media_arr, media_id_arr);
		}
	},

	/////////////////////////////////////////////////////////////////////////////////////////

	getMediaArr: function(){
		var self1 = this;
		var media_arr = [];
		self1.options.gallery.find('>div').each(function(){
			var jdiv = $(this),
				jobj = jdiv.find(':first-child'),
				tagName = jobj.prop('tagName'),
				file_name = jdiv.attr('file_name'),
				file_cat = ''
			;
			switch (tagName){
				case 'IMG': 	file_cat = 'image'; 	break;
				case 'VIDEO':	file_cat = 'video'; 	break;
				case 'AUDIO':	file_cat = 'audio'; 	break;
			}
			var media = {
				media_id: parseInt(jdiv.attr('media_id')),
				file_name: file_name,
				file_cat: file_cat,
			}
			//console.log(media);
			media_arr.push(media);
		});
		return media_arr;
	},

	/////////////////////////////////////////////////////////////////////////////////////////
	//
	// public widget method
	// https://learn.jquery.com/jquery-ui/widget-factory/widget-method-invocation/
	//
	/////////////////////////////////////////////////////////////////////////////////////////

	loadGallery: function(input_arr, bEditable, onComplete){
		var
			self1 = this,
			media_arr = []
		;
		if (typeof(bEditable) == 'undefined'){
			bEditable = self1.options.trash ? 1 : 0;
		}
		// empty gallery
		if (self1.options.gallery){
			self1.options.gallery.empty();
		}
		self1.setEditable(bEditable);
		console.log('***loadGallery', input_arr);

		if (!input_arr || (!input_arr.act_id && !input_arr.length)){
			console.log('no any media');

			onComplete && onComplete();

		} else if (input_arr.act_id || typeof(input_arr[0]) == 'number'){
			call_svrop(
				{
					type: 'get_gallery_media',
					input_arr: input_arr,
					data_type: self1.options.upload_query.data_type,
				},
				function (obj){
					self1.loadGallery2(obj.media_arr, bEditable, onComplete);
				}
			);
		} else {
			self1.loadGallery2(input_arr, bEditable, onComplete);
		}
	},

	/////////////////////////////////////////////////////////////////////////////////////////

	loadGallery2: function(media_arr, bEditable, onComplete){

		console.log('loadGallery2', media_arr);

		var self1 = this;

		// check media_arr
		if (media_arr){

			for (var i = 0; i < media_arr.length; i++){
				var
					media = media_arr[i],
					media_id = media.media_id,
					file_cat = media.file_cat,
					file_name = media.file_name,
					orig_name = media.orig_name,
					media_desc = media.media_desc ? media.media_desc : ''
				;

				if (!file_name){
					console.error('loadGallery needs media_arr not media_id_arr');
					break;
				}

				var file_name2 = file_name;
				if (file_name2.indexOf('.jpg') > 0){
					file_name2 = file_name2.replace('_', '_t');
				}
				var url = self1.options.mediaFolder + file_name2;
				var jdiv = self1.createThumb(self1.options.gallery, file_cat, 0, media_id, file_name, url, bEditable, media_desc, 1);
				jdiv.closest('.div_gallery_item').attr('orig_name', orig_name);
			}

		} else {

			console.log('no any media');
		}

		//self1.setEditable(bEditable);
		onComplete && onComplete();
	},


	//////////////////////////////////////////////////////////////////////////

	createThumb: function(jparent, file_cat, file_id, media_id, file_name, url, bEditable, media_desc, uploaded){
		var self1 = this;

		// 1. CREATE EMPTY DIV (UPLOADER_CHILD)
		var jdiv = self1._addChild(jparent, file_cat, 0, media_id, file_name, media_desc, bEditable, uploaded);

		// 2. CREATE ELEMENT OF MEDIA (PREVIEW IF DONE)
		var jelement = self1._addMediaElement(jdiv.find('.uploader_child'), file_cat, url);

		// 3. ADD TRASH
		var jtrash = 0;
		if (bEditable){
			jtrash = self1._addTrash(jdiv);
		}
		// 4. ADD PLAY BUTTON FOR THE VIDEO
		var bAddPlay = file_cat == 'video' || file_cat == 'audio';
		if (bAddPlay){
			var jplaybut = self1._addPlayBut(jdiv);
			// ADJUSTMENT
			if (!bEditable){
				jplaybut.css('top', -120);
			}
		}

		console.log('createThumb', file_name);
		return jdiv;
	},

	//////////////////////////////////////////////////////////////////////////
/*
	getMedia: function(data_type, ids, onComplete){

		//console.debug('getMedia', data_type, ids, onComplete);

		var self1 = this,
			input = {
				type: 				'get_media',
				data_type:		data_type,
				ids:					JSON.stringify(ids),
			}
		;
		//console.log('getMedia1', input);

		// RETRIEVE FROM DB
		call_svrop(

			// INPUT VARIABLES
			input,

			// ON SUCCESS
			function (obj){
				var media_arr = obj.media_arr;
				console.debug('getMedia', data_type, media_arr);
				self1.loadGallery(media_arr);
				onComplete && onComplete();
			},
			function (obj){
				console.error('failed', obj);
			}
		);
	},
*/
	//////////////////////////////////////////////////////////////////////////////////////////////////////////

	_dlog: function(s){
		switch (this.options.debugLvl)
		{
			case 1: console.log(s); break;
			case 2: console.log(s); break;
			case 3:	alert(s);	break;
		}
	},

	////////////////////////////////////////////////////////////
	// FOR NEW ALGORITHM 20161028
	////////////////////////////////////////////////////////////
	_addChild: function(jparent, file_cat, file_id, media_id, file_name, media_desc, bEditable, uploaded){

		var	self1 = this;
		if (!media_desc) media_desc = '';
		var jdiv = $(
			'<div class="div_gallery_item" file_cat="' + file_cat + '" file_id="' + file_id + '" media_id="' + media_id + '" file_name="' + file_name + '" uploaded="' + uploaded + '">'
				+ '<table class="uploader_tbl">'
					+ '<tr>'
						+ '<td style="width:156px">'
							+ '<div class="div_uploader_body">'
								+ '<div class="uploader_child"></div>'
							+ '</div>'
						+ '</td>'
						+ '<td>'
							+ '<div class="uploader_desc"' + (bEditable ? ' contenteditable="true"' : '') + '>'
							 	+ media_desc
							+ '</div>'
						+ '</td>'
					+ '</tr>'
				+ '</table>'
			+ '</div>'
		)
		.appendTo(jparent);

		if (self1.options.onDescChange){
			jdiv.find('.uploader_desc')
				.on('focus', function() {
					self1.before = $(this).html();
				})
				//.on('blur keyup paste', function(){
				.on('blur', function(){
					var value = $(this).html();
					if (self1.before != value){
						//$(this).trigger('change');
						//console.log('onDescChange', value);
						self1.options.onDescChange && self1.options.onDescChange($(this), value);
					}
				})
		}
		//$('#editor').on('change', function() {alert('changed')});}
		return jdiv.find('.div_uploader_body');
	},

	////////////////////////////////////////////////////////////////////////////////////////////////////////////

	_addProgressBar2: function(jdiv){
		// ADD PROGRESSBAR (EACH FILE HAS 1 PROGRESSBAR)
		var
			self1 = this,
			pbar = new ProgressBar.Circle(jdiv[0], {
				trailColor: self1.options.progressBarColor1,
				color: self1.options.progressBarColor2,
				strokeWidth: self1.options.progressBarSize,
				trailWidth: self1.options.progressBarSize,
				duration: 1500,
				text:{ value: ''},
				step: function(state, bar){
					if (self1.vars.p){
						if (state.color){
							self1.vars.p.path.setAttribute('stroke', state.color);
						} else {
							self1.vars.p.path.setAttribute('stroke', self1.options.progressBarColor2);
						}
					}
				}
			})
		;
		return pbar;
	},

	//////////////////////////////////////////////////////////////////////////////////////////////////////////

	_addTrash: function(jdiv){
		var self1 = this;
		var jtrash = $('<div class="uploader_trash" style="display:none"></div>')//.hide()
			.click(function(e){
				var jobj = $(this),
					jdiv = jobj.closest('.div_gallery_item'),
					file_id = jdiv.attr('file_id'),
					media_id = jdiv.attr('media_id'),
					data_type = self1.options.upload_query.data_type,
					ids = self1.get_query_ids()
				;
				console.log('ondelete', media_id, g_user_id, data_type, ids);//, act_id);?
				confirmDialog('Delete this?', function(){

					// call server to delete this image
					call_svrop(
						{
							type:			'remove_media',
							user_id:		g_user_id,
							media_id:		media_id,
							//data_type:		data_type,	// already recorded
							//ids:			ids,
						},
						function (obj){
							console.debug('succeeded', obj);

							///////////////////////////////////////////////////////////////
							// step 1: remove this image from the gallery
							// do this first else locked file
							///////////////////////////////////////////////////////////////
							console.log('remove div', jdiv);
							//jdiv.hide();
							jdiv.remove();

							/////////////////////////////////////////////////////////////////////////////////
							// case 1. if it is still uploading, remove it by resumable
							/////////////////////////////////////////////////////////////////////////////////
							if (file_id != 0){
								// cancel resumable
								console.log('remove reumable file_id='+file_id);
								var file = self1.vars.r.getFromUniqueIdentifier(file_id);
								if (file){
									self1.vars.r.removeFile(file);
								}
							}

							/////////////////////////////////////////////////////////////////////////////////
							// case 2. already uploaded, remove it from the server
							/////////////////////////////////////////////////////////////////////////////////
							// IN ORDER TO SHOW THE EFFECT OF DELETION, ADD TIME DELAY
							self1.options.onRemove && self1.options.onRemove(media_id);

							// after deletion: call onUpdate
							self1._callOnUpdate();
						});
				});
				// stop propagate to open lightbox
				e.stopPropagation();

			})
			.appendTo(jdiv);
			//.appendTo(jdiv.find('.div_uploader_body');

		return jtrash;
	},

	/////////////////////////////////////////////////////////////////////////////////////////////////

	_addPlayBut: function(jdiv){
		var jplay =
			$('<div class="uploader_play" style="display:none"></div>')//.hide()
				.appendTo(jdiv)
		;
		return jplay;
	},

	/////////////////////////////////////////////////////////////////////////////////////////////////

	_addMediaElement: function(jchild, file_cat, url){
		console.log('addmediaelement', file_cat, url);

		var
			self1 = this,
			jelement = 0
		;
		switch (file_cat){

			case 'video':
				jelement = $('<video class="uploader_video"/>')//.hide()	// in case the video has a cross thru it, hide it
					.css('backgroundColor', 'black')
					.on('loadedmetadata', function(e){
						var jelement = $(this);
						self1._onMediaLoaded(jelement);
					})
				;
				break;

			case 'audio':
				jelement = $('<img class="uploader_audio"/>')	//.hide()	// in case the audio has a cross thru it, hide it
					.load(function(){
						self1._onMediaLoaded(jelement);
					})
				;
				url = './images/icon_audio.png';
				break;

			case 'image':
				jelement = $('<img class="uploader_image"/>')//.hide()	// for preload purpupose
					.load(function(){
						self1._onMediaLoaded($(this));
					})
				;
				break;

			case 'pdf':
				jelement = $('<img class="uploader_image"/>')//.hide()	// for preload purpupose
					.load(function(){
						self1._onMediaLoaded($(this));
					})
				;
				url = './images/icon_pdf.png';
				break;
		}
		if (jelement){
			jelement
				.attr('src', url)
				.appendTo(jchild)
			;
		}
		return jelement;
	},

	/////////////////////////////////////////////////////////////////////////////////////////////////

	_onMediaLoaded: function(jobj){
		var	self1 = this,
			jtop = jobj.closest('.div_gallery_item'),
			jdiv = jobj.closest('div'),
			file_cat = jtop.attr('file_cat'),
			loaded = jobj.attr('loaded') == 1,
			size = parseInt(this.options.maxThumbNailSize)
		;
		if (!loaded){

			// RETRIEVE THE WIDTH AND HEIGHT
			var w = 0, h = 0;
			switch (file_cat){

				case 'video':
					w = jobj[0].videoWidth;
					h = jobj[0].videoHeight;
					break;

				case 'audio':
					w = h = 0;
					jobj.css({width:'150px', height:'150px'});	// correct 222 to this, but why?
					break;

				case 'image':
					w = jobj[0].width;
					h = jobj[0].height;
					break;
			}

			// REMOVE THE BACKGROUND COLOR
			if (jtop.attr('uploaded') == 1){
				jtop.find('.uploader_trash, .uploader_play').show();
			}

			// SET AS LOADED (PREVENT A CONVERSION)
			if (w && h){
				jobj
					.attr('w', w)
					.attr('h', h)
					.attr('loaded', 1)
					.width(size - 8)
					.height(size - 8)
					.show()
				;
			}

			// SET HOVERING
			var color_default = '#e0e0e0', color_highlight = '#228b22';	// foresetgreen
			jobj
				.hover(function(e){
					var jobj = $(this);
					// prevent effect in lightbox
					if (jobj.closest('.featherlight').length){
						return;
					}
					if (jobj.attr('hovering') != 1){
						jobj
							.attr('hovering', 1)
							.animate({
								borderTopColor: color_highlight,
								borderBottomColor: color_highlight,
								borderLeftColor: color_highlight,
								borderRightColor: color_highlight,
							}, 1000);
					}
				})
				// LEAVE TO FADE OUT BORDER
				.mouseleave(function(e){

					var jobj = $(this);
					// prevent effect in lightbox
					if (jobj.closest('.featherlight').length){
						return;
					}

					if (jobj.attr('hovering') == 1){
						jobj
							.attr('hovering', 0)
							.animate({
								borderTopColor: color_default,
								borderBottomColor: color_default,
								borderLeftColor: color_default,
								borderRightColor: color_default,
							}, 500);
					}
				})
			;

			// SHOW THIS
			if (self1.options.gallery){
				self1.options.gallery.show();
			}
			jdiv.show();

			///////////////////////////////////////////////////////////////////////
			// SET CLICK TO LIGHTBOX
			///////////////////////////////////////////////////////////////////////
			// the media tag
			self1._addClick(jobj);

			// play button
			var jplay = jtop.find('.uploader_play');
			self1._addClick(jplay);

		}
	},

	///////////////////////////////////////////////////////////////////////////////
	// ADD CLICK TO OPEN LIGHTBOX
	///////////////////////////////////////////////////////////////////////////////

	_addClick: function(jobj){
		var self1 = this;
		jobj.click(function(){
			console.log('click', jobj);
			// prevent effect in lightbox
			if (!jobj.closest('.featherlight').length){
				// OPEN LIGHT BOX
				self1._openLightBox(jobj);
			}
		});
	},

	///////////////////////////////////////////////////////////////////////////////////////////////////////////////

	_openLightBox: function(jelement){
		$('.leftarrow').css('visibility', 'hidden');
		var self1 = this;
		var jdiv = 0, url = '';
		if (jelement.hasClass('div_gallery_item')){
			jdiv = jelement;
		} else {
			jdiv = jelement.closest('.div_gallery_item');
		}
		var jelement = jdiv.find('video, img');
		var file_cat = jdiv.attr('file_cat');
		if (!file_cat){
			var jtbl = jdiv.closest('.uploader_tbl'),
			file_cat = jtbl.parent().attr('file_cat');
		}
		var url = '';
		if (file_cat != 'pdf'){
			url = jelement.attr('src');
			if (url.indexOf('.jpg') > 0){
				url = url.replace('_t', '_');
			}
		}

		//console.log('open video', url);
		self1._resetHighlight(1);

		// MARK FOR GALLEARY NAVIGATION
		$('.lightbox_selected').removeClass('lightbox_selected');

		var parentClass = self1.options.parentClass;
		if (!parentClass){
			self1.options.parentClass =
			parentClass = '.div_gallery_item';
		}
		var jparent = jelement.closest(parentClass);
		//console.debug(jparent);
		jparent.addClass('lightbox_selected');

		// CREATE A NEW ELEMENT AND OPEN LIGHTBOX
		switch (file_cat){

			case 'video':
				var jvideo =
					$('<video controls/>')	// autoplay is not working here cos it will cause double playback (why?)
						.on('loadedmetadata', function(e){
							// OPEN LIGHTBOX (VIDEO)
							var
								w = this.videoWidth,
								h = this.videoHeight
							;
							if (!w && !h){
								w =
								h = 156;
							}
							self1._openLightBox2(jvideo, w, h);
						})
						.attr('src', url);
				break;

			case 'audio':
				var
					item = jelement.closest('.div_gallery_item'),
					file = item.attr('file'),
					file_name = item.attr('file_name'),
					orig_name = item.attr('orig_name'),
					url = self1.options.mediaFolder + file_name
				;
				var jaudio =
					$('<audio controls/>')	// autoplay is not working here cos it will cause double playback (why?)
						.on('loadedmetadata', function(e){
							var
								w = g_nScreenW - 40,
								h = 150
							;
							self1._openLightBox2(jaudio, w, h);
						})
						.attr('src', url);
				break;

			case 'image':
				var	jimage =
					$('<img class="uploader_image"/>')
						.load(function(e){
							// OPEN LIGHTBOX (IMAGE)
							self1._openLightBox2(jimage, this.width, this.height);
						})
				;
				jimage
					.attr('src', url)
					.each(function(){
					  if (this.complete){
							self1._openLightBox2(jimage, this.width, this.height);
					  }
					})
				;
				break;

			case 'pdf':
				var
					item = jelement.closest('.div_gallery_item'),
					file = item.attr('file'),
					file_name = item.attr('file_name'),
					orig_name = item.attr('orig_name'),
					url = self1.options.mediaFolder + file_name
				;
				viewPDF(url, file_name, orig_name);
				break;
		}
	},

	////////////////////////////////////////////////////////////////////////////////////////

	_openLightBox2: function(jelement, w, h){
		var self1 = this;
		$('.leftarrow').css('visibility', 'hidden');
		// LOADING
		if (jelement.attr('loaded_lightbox') != 1){
			jelement.attr('loaded_lightbox', 1);

			resizeLightBox(jelement, w, h);

			// https://github.com/noelboss/featherlight
			$.featherlight(jelement, {
					galleryFadeIn: 100,          // fadeIn speed when slide is loaded
					galleryFadeOut: 300,          // fadeOut speed before slide is loaded

					closeOnClick: 'background',

					onKeyUp: function(e){
						console.info('onKeyUp', e);
						switch (e.which){
							case 37: // left
								goFeatherLightPrev();
								break;

							case 39:	// right
								goFeatherLightNext();
								break;
						}

					},

					beforeOpen: function(){
						//console.log('beforeOpen');
						$('.featherlight-content').hide();	// avoid showing unloaded box
					},

					afterContent: function(){
						console.log('afterContent');

						g_feather = this;
						g_gallery = self1;
						var
							jprev = $('<span title="previous" class="featherlight-previous"><span>&#9664;</span></span>').click(goFeatherLightPrev)
							jnext = $('<span title="next" class="featherlight-next"><span>&#9654</span></span>').click(goFeatherLightNext)
						;
						var
							jobj = this.$content
						;
						var tagName = jobj.prop('tagName');
						switch (tagName){
							case 'IFRAME':	// pdf
							case 'VIDEO':
							case 'AUDIO':
								break;

							default:
								jobj.parent()
									.append(jprev)
									.append(jnext)
								;
								break;
						}
						$('.featherlight-content').fadeIn(1000, function(){
							switch (tagName){
								case 'VIDEO':
								case 'AUDIO':
									jobj[0].play();
									break;
							}
						});
					},
					afterOpen: function(){
						console.log('afterOpen');

					},
					beforeClose: function(){
						console.log('beforeClose');
						$('.featherlight-content').fadeOut(1000);
						if (jelement.prop('tagName') == 'VIDEO'){
							jelement[0].pause();
						}
						jelement.remove();
						self1._resetHighlight(0);
						$('.leftarrow').css('visibility', 'visible');
					},
			});
		}
	},

	////////////////////////////////////////////////////////////////////////////////////////

	getMediaIDArr: function(){
		var self1 = this;
		var media_id_arr = [];
		var jitems = self1.options.gallery.find('.div_gallery_item');
		jitems.each(function(){
			var media_id = parseInt($(this).attr('media_id'));
			//console.debug('getMediaIDArr media_id=', media_id);
			media_id_arr.push(media_id);
			//media_id_arr[media_id_arr.length] = media_id;
		});
		//console.debug('getMediaIDArr arr=', media_id_arr);
		return media_id_arr;
	},

	////////////////////////////////////////////////////////////////////////////
	// save media desc according to its media_id
	////////////////////////////////////////////////////////////////////////////
	getMediaDescHash: function(){
		// find media_desc
		var self1 = this;
		var media_desc_hash = {};
		// loop thru the input
		var jitems = self1.options.gallery.find('.div_gallery_item');
		jitems.each(function(){
			var media_id = $(this).attr('media_id');
			var media_desc = $(this).find('.uploader_desc').html();
			media_desc_hash[media_id] = media_desc;
		});
		return media_desc_hash;
	},

	////////////////////////////////////////////////////////////////////////////

	saveMediaDesc: function(onComplete){
		console.debug('saveMediaDesc');
		var media_desc_hash = this.getMediaDescHash();
		call_svrop(
			{
				type: 'save_media_desc',
				media_desc_hash: media_desc_hash,
			}
			// ON SUCCESS
			,function (obj){
				console.info('saveMediaDesc succeeded');
				onComplete && onComplete();
			}
		);
	},

	////////////////////////////////////////////////////////////////////////////

	set_query_ids: function(ids){
		console.log(this.options.upload_query.ids);
		this.options.upload_query.ids = JSON.stringify(ids);
		this.createResumable(this.options);
	},

	get_query_ids: function(){
		return JSON.stringify(this.options.upload_query.ids);
	},

	setEditable: function(bEditable){
		var opts = this.options;
		opts.trash = bEditable ? 1 : 0;
		var jbutton = opts.element;
		var jgallery = opts.gallery;
		if (bEditable){
			//juploader.parent().show();
			jbutton.parent().show();
			jgallery.find('.uploader_trash').show();
		} else {
			//juploader.parent().hide();
			jbutton.parent().hide();
			jgallery.find('.uploader_trash').hide();
		}

	},

	_addUnderScoreToFile: function(file){
		var index = file.indexOf('.');
		if (index >= 0){
			file_name = file.substring(0, index),
			file_ext = file.substring(index)
			return file_name + '_' + file_ext;
		} else {
			return file;
		}
	},

	createResumable: function(opts){
		var
			self1 = this,
			el = opts.element,
			uid = opts.uid,
			r = self1.vars.r = new Resumable({
				target: opts.target,
				query: opts.upload_query,
				testChunks: 0,	// overwrite everytime
			})
		;
		r.added = 0;
		r.uid = uid;
		//console.log('resumable', uid, r);
		try {
			r.assignBrowse(el[0]);

		} catch (e){
			console.error('resumablejs error');
			return;
		}

		// EVENTS
		r.on('fileAdded', function(file){

			var robj = this;	// resumable obj

			//////////////////////////////////////////////////////////
			// ONFILEADDED
			//////////////////////////////////////////////////////////
			// FIND THE LOCAL FILE
			var
				uid = robj.uid,
				file_id = file.uniqueIdentifier,
				file_name = file.fileName,
				file_cat = self1._mime2cat(file.file.type),
				blob_url = URL.createObjectURL(file.file)
			;
			console.log('fileAdded uid=' + uid);

			////////////////////////////////////////////////////////////
			// ADD PREVIEW (=DESTINATION)
			////////////////////////////////////////////////////////////
			if (!file_cat || file_cat == ''){

				// remove file_id
				self1.vars.r.removeFile(file);

				var s = 'Unrecognizable mime type: ' + file.file.type;
				self1._dlog(s);

				errorDialog(s);

			} else if (opts.gallery && opts.gallery.length){

				//if (!opts.gallery.length){
				//	console.error('no valid gallery', opts.gallery);
				//	return;
				//}

				//////////////////////////////////////////////////////////////////
				// SEPARATE UPLOAD AND MEDIA ELEMENT LOADING
				//////////////////////////////////////////////////////////////////
				var media_desc = '';
				var jdiv = self1.createThumb(opts.gallery, file_cat, file_id, 0, file_name, blob_url, 1, media_desc, 0);
				scroll2Element(jdiv, function(){
					//setTimeout(function(){
						file.jdiv = jdiv;
						file.pbar = self1._addProgressBar2(jdiv);
						jdiv.find('svg').addClass('uploader_progress');

						//file.pbar.set(.5); return;	// **testing only

						// 6. START UPLOAD
						robj.upload();

						// 7. CALL SERVER FOR CONVERSION TO A COMMON FORMAT
					//}, 50);
				});
			} else {
				robj.upload();
			}
		});

		///////////////////////////////////////////////////////////////////////////////////////////////////////

		r.on('fileProgress', function(file){
			var robj = this;
			var progress = file.progress();
			console.log('fileProgress uid=' + uid, progress);
			if (file.pbar){
				file.pbar.set(progress);	// (0-1, 1=100%)
			} //else {
				//console.error('file.pbar not created yet');
			//}
		});

		///////////////////////////////////////////////////////////////////////////////////////////////////////
		// right after a file is uploaded

		r.on('fileSuccess', function(file, message){
			var jparent = file.jdiv;
			if (!jparent || !jparent.length){
				self1.options.onUploaderSuccess && self1.options.onUploaderSuccess(file, message);
				return;
			}

			var robj = this;
			var jdiv = file.jdiv.closest('.div_gallery_item'),
				jprogress = jdiv.find('svg.uploader_progress'),
				file_cat = self1._mime2cat(file.file.type);
				error = file.error ? file.error : 0,
				media_id = file.media ? file.media.media_id : 0,
				file_name = file.media ? file.media.file_name : '',
				orig_name = file.media ? file.media.orig_name : '',
				file_id = file.uniqueIdentifier,
				file_size = file.size
			;
			// conplete the pbar
			file.pbar.set(1);	// (0-1, 1=100%)

			// add media_id
			jdiv
				.attr('media_id', media_id)
				.attr('file_name', file_name)
				.attr('orig_name', orig_name)
			;
			// remove file_id
			var file = self1.vars.r.getFromUniqueIdentifier(file_id);
			self1.vars.r.removeFile(file);
			jdiv.attr('file_id', 0);

			// reset opacity
			jdiv.find('.uploader_child:first-child').css('opacity', 1);

			// after addition: call onUpdate
			self1._callOnUpdate();

			console.log('fileSuccess uid=' + uid, 'media_id='+media_id);

			// DELAY TO REMOVE PROGRESSBAR
			setTimeout(function(){	// add delay to show 100% pbar

				var jtop = jprogress.closest('.div_gallery_item');
				jtop.find('.uploader_trash, .uploader_play').show();

				// remove progressbar
				jprogress.remove();

				// ERROR?
				if (error){
					console.error('Error: ' +  error + '. The file ' + file_name + ' is removed');//, file, message);
					jdiv.remove();

				} else {

					switch (file_cat){

						case 'image':
						case 'video':
							if (file_cat == 'image'){
								file_name = self1._addUnderScoreToFile(file_name);
							}
							var url = file_name;
							if (url.indexOf('http') != 0){
								url = opts.mediaFolder + file_name;
							}

							jdiv.find('.uploader_child *').attr('src', url);
							break;
					}
				}
				self1.options.onUploaderSuccess && self1.options.onUploaderSuccess(file, message);

			}, 500);
		});

		///////////////////////////////////////////////////////////////////////////////////////////////////////

		r.on('complete', function(){
			var robj = this;
			console.info('auploader complete', robj.uid);
			robj.cancel();	// restart
			robj.added = 0;

		});

		///////////////////////////////////////////////////////////////////////////////////////////////////////

		r.on('fileError', function(file, message){
			var robj = this;
			//console.error('fileError', uid, file);
			//self1._dlog('fileError: ' + message);
			//alert('fileError: ' + message);

			// remove demo
			file.jdiv.remove();

			// remove file
			self1.vars.r.removeFile(file);

			// show alert message
			alert(message);
		});

		//self1.vars.r = r;

	}

});

///////////////////////////////////////////////////////////////////////
// EASY CALLER
// - onload is needed as the instance are created after the callback
///////////////////////////////////////////////////////////////////////
var g_gallery = 0, g_feather = 0;

function goFeatherLightPrev(){
	console.info('goFeatherLightPrev');
	var jdiv = g_gallery.options.gallery.find('.lightbox_selected').prev();
	if (!jdiv.length){
		var jparent = g_gallery.options.gallery.find(g_gallery.options.parentClass);
		if (jparent){
			jdiv = jparent.parent().find('.div_gallery_item:last-child');
		}
	}
	g_feather.close();
	if (!jdiv.length){
		console.error('prev item not found');
	} else if (jdiv.length > 1){
		console.error('prev too many: ' + jdiv.length);
	} else {
		g_gallery._openLightBox(jdiv.find('video, img'));
	}
}
/////////////////////////////////////////////////////////////////////////////////////////////////

function goFeatherLightNext(){
	console.info('goFeatherLightNext');
	var	jdiv = g_gallery.options.gallery.find('.lightbox_selected').next();
	if (!jdiv.hasClass('.uploader_child')){
		jdiv = jdiv.find('.uploader_child');
	}
	if (!jdiv.length){
		var jparent = g_gallery.options.gallery.find(g_gallery.options.parentClass);
		if (jparent){
			jdiv = jparent.parent().find('.div_gallery_item:first-child');
		}
	}
	g_feather.close();
	if (!jdiv.length){
		console.error('next item not found');
	} else if (jdiv.length > 1){
		console.error('next too many: ' + jdiv.length);
	} else {
		g_gallery._openLightBox(jdiv.find('video, img'));
	}
}

//////////////////////////////////////////////////////////////////////////

function resizeLightBox(jelement, w, h){
	var
		marginratio = .9,
		sw = parseInt(window.innerWidth|| document.documentElement.clientWidth || document.body.clientWidth) * marginratio,
		sh = parseInt(window.innerHeight|| document.documentElement.clientHeight || document.body.clientHeight) * marginratio,
		w = parseInt(w),
		h = parseInt(h),
		ratio = w / h
	;
	// SET NEW WIDTH AND RATIO
	if (w > sw){
		w = sw;
		h = w / ratio;
	}
	if (h > sh){
		h = sh;
		w = h * ratio;
	}
	jelement.width(w).height(h);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////

function initUploader(jbutton, jgallery, data_type, ids, onUpdate2, parentClass, bEditable, mediaFolder, onDescChange, more_opts){

	if (jbutton.attr('uid')){
		console.log('already initialized uploader');
		return;
	}

	// DEFINE COMMON INPUT
	if (!jbutton){
		jbutton = jgallery;	// really okay?
	}
	if (!bEditable){
		bEditable = 0;
	}
	if (!parentClass){
		parentClass = 0;
	}
	console.log('***initUploader', jbutton.prop('id'), data_type, jgallery);

	var upload_query = {
		type: 'ul_media',
		data_type: data_type,
		ids: JSON.stringify(ids),
	}
	// CREATE UPLOADER
	var opts = {

		target: 				'./svrop.php',
		trash: 					bEditable,
		upload_query: 	upload_query,
		gallery: 				jgallery,

		// SAVE TO COLLECTION
		onLoad: function(uid){
			console.info('onload', uid);
		},

		// ON UPDATE
		onUpdate: function(media_arr, media_id_arr){
			console.log('onUpdate', media_arr, media_id_arr);
			onUpdate2 && onUpdate2(media_arr, media_id_arr);
		},

		onDescChange: onDescChange,

		parentClass: parentClass,
	};
	if (mediaFolder){
		opts.mediaFolder = mediaFolder;
	}
	if (more_opts){
		opts = merge_options(opts, more_opts);
	}
	jbutton.uploader(opts);
}
