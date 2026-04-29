(function() {
  window.createMpegtsDemoPlayer = function(shared) {
    var videoElement = shared.elements.videoElement;
    var player = null;
    var currentUrl = '';

    shared.setOverlayMedia(videoElement);

    function destroyPlayer() {
      if (!player) {
        return;
      }

      player.destroy();
      player = null;
    }

    function createPlayer(url) {
      player = mpegts.createPlayer({
        type: 'mse',
        isLive: true,
        url: url
      }, {
        enableWorker: true,
        lazyLoadMaxDuration: 3 * 60,
        seekType: 'range',
        liveBufferLatencyChasing: true,
        liveSync: false,
        liveBufferLatencyMaxLatency: 1.5,
        liveBufferLatencyMinRemain: 0.5
      });

      player.attachMediaElement(videoElement);

      player.on(mpegts.Events.ERROR, function(errorType, errorDetail, errorInfo) {
        console.error('mpegts.js player error:', errorType, errorDetail, errorInfo);
      });

      player.on(mpegts.Events.MEDIA_INFO, function(mediaInfo) {
        console.log('mpegts.js media info:', mediaInfo);
      });

      player.on(mpegts.Events.SEI_ARRIVED, function(data) {
        shared.overlay.pushData(data);
      });

      player.load();
      currentUrl = url;
    }

    async function startPlayer() {
      var url = shared.elements.streamUrl.value.trim();
      if (!url) {
        alert('请输入流地址');
        return;
      }

      try {
        await shared.ensureScript('mpegts-lib', './mpegts.js/mpegts.js');
      } catch (error) {
        console.error(error);
        alert('mpegts.js 加载失败');
        return;
      }

      if (!mpegts.getFeatureList().mseLivePlayback) {
        alert('当前浏览器不支持 MSE Live Playback');
        return;
      }

      if (!player || currentUrl !== url) {
        destroyPlayer();
        shared.resetOverlayData();
        createPlayer(url);
      }

      player.play();
      shared.overlay.show();
      shared.updatePlayPauseLabel(false);
    }

    function pausePlayer() {
      if (!player) {
        return;
      }

      player.pause();
      shared.updatePlayPauseLabel(true);
    }

    function stopPlayer() {
      destroyPlayer();
      shared.resetOverlayData();
      currentUrl = '';
      shared.updatePlayPauseLabel(true);
    }

    videoElement.addEventListener('play', function() {
      shared.updatePlayPauseLabel(false);
    });

    videoElement.addEventListener('pause', function() {
      shared.updatePlayPauseLabel(true);
    });

    return {
      togglePlayPause: function() {
        if (!player) {
          startPlayer();
          return;
        }

        if (videoElement.paused) {
          player.play();
          shared.updatePlayPauseLabel(false);
        } else {
          pausePlayer();
        }
      },
      stop: stopPlayer,
      destroy: function() {
        destroyPlayer();
        currentUrl = '';
        shared.updatePlayPauseLabel(true);
      }
    };
  };
})();
