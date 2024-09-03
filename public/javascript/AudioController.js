class AudioController {
	constructor(){
		this.SFXVolume = 0.35;
		this.musicVolume = 0.25;
		this.backgroundSong = null
		Howler.volume(1)
		// $('input').change(function(e) {
    //   	Howler.volume( $("#masterVolumeInput").val()/100)
    //   	SFXVolume = $("#sfxVolumeInput").val()/100
    //   	musicVolume = $("#musicVolumeInput").val()/100
    //   	if(backgroundSong == null){
    //    		switchBackgroundSong("tranquilitySong")
    //    	}
    //     backgroundSong.volume(musicVolume)
    // })
	}
	playAudio(soundName,soundVolume=1.0,doLoop=false,doAutoplay=true){
		console.log(`Playing sound::::::::::::::::: ${soundName}`);
		const filepath = '/sounds/'+soundName
		var sound = new Howl({
			src: [filepath+'.wav',filepath+'.mp3'],
			autoplay: doAutoplay,
			loop: doLoop,
			volume: soundVolume,
			// onend: function() {}
		});
		sound.play();
		return sound
	}
	switchBackgroundSong(songname){
		if(this.backgroundSong) {backgroundSong.stop()}
		this.backgroundSong = playAudio(songname,this.musicVolume,true)
	}
	doSFX(action="move"){
		this.playAudio(action,this.SFXVolume,false)
	}
	grabSFX(status){
		if (status == "success"){
			this.playAudio("success",this.SFXVolume,false)
		} else if (status == "fail"){
			this.playAudio("wrong",this.SFXVolume,false)
		}
	
	}

}