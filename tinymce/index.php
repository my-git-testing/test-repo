<!DOCTYPE html>
<html>
<head>
<!--
	https://www.tinymce.com/docs/demo/file-picker/
	https://codepen.io/nirajmchauhan/pen/EjQLpV
	https://stackoverflow.com/questions/46155757/tinymce-upload-audio-video-images-files
	
-->
<style>
.hidden, .mce-branding.mce-widget{
	display: none;
}
</style>
<script src="//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script>
<script src="./tinymce.min.js"></script>
<!--
<script src="https://cloud.tinymce.com/stable/tinymce.min.js?apiKey=f7xoya2v1myav1bgcyh3mo89xcomxzv7egw1po2g7a6l4zbe"></script>
-->
<script>
///*
tinymce.init({
		selector: "textarea",
		theme: "modern",
		plugins: [
			"advlist autolink lists link image charmap print preview hr anchor pagebreak",
			"searchreplace wordcount visualblocks visualchars code fullscreen",
			"insertdatetime media nonbreaking save table contextmenu directionality",
			//"emoticons template paste textcolor colorpicker textpattern table media mediaembed"
			"emoticons template paste textcolor colorpicker textpattern table media"
		],
		toolbar1: "table insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image",
		toolbar2: "print preview media | forecolor backcolor emoticons",
		file_picker_callback: function(callback, value, meta) {
			var type = meta.filetype;
			console.log(type, meta);
			$('#upload').trigger('click');
			$('#upload').on('change', function() {
				var file = this.files[0];
				switch (type){
					
					case 'image':
						var reader = new FileReader();
						reader.onload = function(e) {
							callback(e.target.result, {
								alt: ''
							});
						};
						reader.readAsDataURL(file);
						break;
						
					case 'media':
						console.log('upload now');
						break;
					
				}
			});
		},
		image_advtab: true,
		paste_data_images: true,
		media_live_embeds: true,
		mediaembed_max_width: 450,
	});
//*/
/*
tinymce.init({
   selector: "textarea",
   plugins: "a11ychecker, advcode, linkchecker, media mediaembed, powerpaste, tinymcespellchecker",
   toolbar: "a11ycheck, code, media, mediaembed"
});
*/

function goOnSubmit(){
	console.log(tinyMCE.activeEditor.getContent());
}
</script>
</head>
<body>
	<input id="upload" name="image" type="file" class="hidden" onchange="">
  <textarea></textarea>
	
	<button onclick="goOnSubmit()">Submit</button>
</body>
</html>