Dropzone.autoDiscover = false;

var addedFile = 0;

var myDropzone = new Dropzone("#convertImages", {

  url: "./main.php",
  autoProcessQueue: false,
  maxFilesize: 2, // MB
  dictDefaultMessage: "Drop your 5+ images here! <br> Converts all your images to the 2 required formats: <br> 5.5, 6.5 inch as required by the Apple App Store.",
  parallelUploads: 5,
  uploadMultiple: true,
  maxFiles: 5,
  acceptedFiles: '.png, .jpg, .jpeg',
  addRemoveLinks: true

});

var regexEmail = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);

$('#upload').click(function(e){ 

  if(!$('#email').val()) {

    alert("Please enter your email so we can send you your converted files!");
    return false;

  }else if(!regexEmail.test($('#email').val())){

    alert("Please enter a valid email!");
    return false;

  }else if(addedFile == 0) {

    alert("Please add 1 - 5 files!");
    return false;
  
  }else{

    e.preventDefault();
    e.stopPropagation();
    myDropzone.processQueue();
    $('#upload').html("Converting...")

  }

});

myDropzone.on("sending", function(file, xhr, formData) {
  // Send other form data along with the file as POST data.
  formData.append("email", jQuery("#email").val());

});

myDropzone.on("addedfile", function(file) {

    addedFile++;    

});

myDropzone.on("removedfile", function(file) {

    addedFile--;

});

myDropzone.on("successmultiple", function() {
  
  $('#upload').html("Convert My Images");
  alert("Conversion complete, check your email.");
  myDropzone.removeAllFiles();

});

myDropzone.on("error", function(file, message) {

  alert(message);
  myDropzone.removeFile(file);
  $('#upload').html("Convert My Images");

});

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-81465180-1', 'auto');
ga('send', 'pageview');