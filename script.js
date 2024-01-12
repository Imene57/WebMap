
window.onload = init
    
function init(){
     //Map
     const map = new ol.Map({
        
        view: new ol.View({
            center: [-70954.81624963802, 3955118.649904738],
            zoom: 6,
        }),
    
        target:'map'
    })

    // Layers
    const ImageSat = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' 
        }),
        visible: false,
        title:"ImageSat",
        
    })
    map.addLayer(ImageSat)
    const OSMStandard = new ol.layer.Tile({
        source: new ol.source.OSM({
        }),
        visible: true,
        title:"OSMStandard",
    })
    map.addLayer(OSMStandard)   

    // Switcher Control
    var switcher = new ol.control.LayerSwitcher({
        activationMode: 'click',
        startActive: false,
        groupSelectStyle: 'children'
    })
    map.addControl(switcher)

     //Fullscreen control 
     var fullScreen = new ol.control.FullScreen()
     map.addControl(fullScreen)

     //MousePosition
    var mousePosition = new ol.control.MousePosition({
        className:'mousePosition',
        projection:'EPSG:4326',
        coordinateFormat: function(coordinate){return ol.coordinate.format(coordinate, '{x}   {y}', 4);}
    })
    map.addControl(mousePosition)

    // Add file to html

    const styles = [
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: 'green',
            width: 2,
          }),
          fill: new ol.style.Fill({
            color: 'rgba(0, 0, 255, 0.1)',
          }),
        }),
        new ol.style.Style({
          image: new ol.style.Circle({
            radius: 3,
            fill: new ol.style.Fill({
              color: 'red',
            }),
          }),
        }),
      ];


    function addVector(url,name){
        var vectorLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
                url: url,
                format: new ol.format.GeoJSON()
            }),
            style: styles,
            name:name,
            title: name
            
        });
        map.addLayer(vectorLayer);
    }

    function addLayer(file,data){
        fileName = file.name;
        typeGeometry = data.features[0].geometry.type;
        const layerList = document.getElementsByClassName('layerList');
        let divLayerGrp = document.createElement('div');
        divLayerGrp.className = 'layerGroup';
        let div = document.createElement('div');
        div.className = 'layer';
        div.innerHTML = '<input type="checkbox" name="'+ fileName +'" class="activeLayer" checked><h4>'+ fileName +'</h4><a href="#" class="zoom"><i class="fa-solid fa-magnifying-glass"></i></a>'
        divLayerGrp.appendChild(div);
        layerList[0].appendChild(divLayerGrp);

    }
    function addLayerNoData(file){
      fileName = file.name;
      const layerList = document.getElementsByClassName('layerList');
      let divLayerGrp = document.createElement('div');
      divLayerGrp.className = 'layerGroup';
      let div = document.createElement('div');
      div.className = 'layer';
      div.innerHTML = '<input type="checkbox" name="'+ fileName +'" class="activeLayer" checked><h4>'+ fileName +'</h4><a href="#" class="zoom"><i class="fa-solid fa-magnifying-glass"></i></a>'
      divLayerGrp.appendChild(div);
      layerList[0].appendChild(divLayerGrp);

  }
    let strokeCache = {
      '2': new ol.style.Stroke({ // állam
        color: [255, 35, 35],
        width: 4
      }),
      '5': new ol.style.Stroke({ // régió
        color: [255, 35, 35],
        width: 2
      }),
      '6': new ol.style.Stroke({ // megye
        color: [255, 145, 1],
        width: 1
      }),
      '7': new ol.style.Stroke({ // járás
        color: [183, 64, 0],
        width: 1
      }),
      '8': new ol.style.Stroke({ // település
        color: [225, 198, 76],
        width: 1
      }),
      '9': new ol.style.Stroke({ // kerület
        color: [35, 35, 35],
        width: 1
      })
    };
    
    let defaultStyle = new ol.style.Style({
      fill: new ol.style.Fill({
        color: [255, 255, 255, 0.2]
      }),
      stroke: new ol.style.Stroke({
        color: [255, 35, 35],
        width: 1.5
      }),
      text: new ol.style.Text({
        text: '',
        fill: new ol.style.Fill({
          color: [33, 33, 33]
        })
      })
    });


    // its very important for performance to cache styles
    let vectorStyle = (feature, resolution) => {
      let level = feature.get('level');
      let text = feature.get('name');
      if (level == 9 && resolution > 110) return null;
      if (level == 8 && resolution > 110) return null;
      if (level == 7 && resolution > 250) return null;
      if (level == 6 && resolution > 350) return null;
      if (level == 5 && resolution > 450) return null;
      //if (level == 2 && resolution > 700) return null;
      defaultStyle.text_.text_ = text;
      defaultStyle.stroke_ = strokeCache[level];
      return [defaultStyle];
    };



    let GeoTIFFloader = function (img, src) {
      const self = this;
      const canvas = document.createElement('canvas');
      GeoTIFF.fromUrl(src)
        .then(tiff => tiff.getImage()
          .then(image => {
            const width = image.getWidth();
            const height = image.getHeight();
            const bbox = image.getBoundingBox();
            // world files (TFW) not supported!
            
            canvas.width = width;
            canvas.height = height;
            self.extent = bbox;
            image.readRGB().then(raster => {

              // render raw image data (rgb) to canvas
              let ctx = canvas.getContext("2d");
              let imageData = ctx.createImageData(width, height);
              let o = 0;
              for (let i = 0; i < raster.length; i += 3) {
                imageData.data[o] = raster[i];
                imageData.data[o + 1] = raster[i + 1];
                imageData.data[o + 2] = raster[i + 2];
                imageData.data[o + 3] = 255;
                o += 4;
              }
              ctx.putImageData(imageData, 0, 0);

              img.getImage().src = canvas.toDataURL();
            })
          }))
        .catch(error => console.error(error));
    };

    let SHPloader = function (extent, resolution, projection) {
      const self = this;
      shapefile.open(self.getUrl())
        .then(source => source.read()
          .then(function load(result) {
            if (result.done) return;
            self.addFeatures(
              self.getFormat().readFeatures(result.value)
            );
            return source.read().then(load);
          }))
        .catch(error => self.removeLoadedExtent(extent))
    };
    
    $('#file').change(function(){
        let fileInput = document.getElementsByClassName('inputfile');
        const selectedFiles = [...fileInput[0].files];
        const fileExt = selectedFiles[0].name.split('.').pop();
        const filePath = URL.createObjectURL(selectedFiles[0]);
        if( fileExt === 'geojson' || fileExt === 'json'){
          fetch(filePath)
            .then((res) => {
                addVector(res.url,selectedFiles[0].name)
            return(res.json())
            })
            .then((data) => addLayer(selectedFiles[0],data))
        }
        else if(fileExt === 'tiff' || fileExt === 'tif'){
          var geotiffFile = new ol.layer.Image({
            title: selectedFiles[0].name,
            source: new ol.source.ImageStatic({
              imageLoadFunction: GeoTIFFloader,
              imageExtent: ol.proj.get('EPSG:3857').getExtent(),
              url: filePath
            }),
            visible: true,
            name:selectedFiles[0].name
          })
          map.addLayer(geotiffFile); 
          addLayerNoData(selectedFiles[0]);
        }
        else if(fileExt === 'kml'){
          var kmlFile = new ol.layer.Vector({
            title: 'KML',
            source: new ol.source.Vector({
              format: new ol.format.KML(),
              url: filePath
            }),
            style: vectorStyle,
            visible: true,
            name:selectedFiles[0].name
          })
          map.addLayer(kmlFile);
          addLayerNoData(selectedFiles[0]);
        }
        
    });
    
    
    // Zoom to layer 
    $(document).ready(function(){
      $(document).on('click','.zoom',function(e){
        var namelayer = e.target.previousElementSibling.previousElementSibling.innerHTML
        const ext = namelayer.split('.').pop();
        if(ext === 'tiff' || ext === 'tif'){
          map.getLayers().forEach((layer)=>{
            if(namelayer === layer.get('title')){
              // Zoom to Image Extent
              const tiffUrl = layer.getSource().getUrl();
              GeoTIFF.fromUrl(tiffUrl)
                .then(tiff => tiff.getImage()
                  .then(image => {
                    var bbox = image.getBoundingBox();
                    map.getView().fit(bbox ,{ duration: 1000 });
                  }))
            }
          })
        }
        else{
          map.getLayers().forEach((layer)=>{
            // getFeaturesInExtent
            if(namelayer === layer.get('title')){
              // Zoom to Layer Extent
              map.getView().fit(layer.getSource().getExtent() ,{ duration: 1000 });
            }
          })
        }
        
      })
    })

    // Activate / disactivate layer
    $(document).ready(function(){
      $(document).on('click','.activeLayer',function(e){
        const namelayer = e.target.name;
        map.getLayers().forEach((layer)=>{
          if(namelayer === layer.get('title')){
            layer.setVisible(e.target.checked);
          }
        })
      })
    })

    // Add points file
    function addCSV(file){
      const features = [];
      const fileName = file.name;
      const layerList = document.getElementsByClassName('layerList');
      let divLayerGrp = document.createElement('div');
      divLayerGrp.className = 'layerGroup';
      let div = document.createElement('div');
      div.className = 'layer';
      div.attributes['name'] = file.name;
      div.innerHTML = '<input type="checkbox" name="'+file.name+'" class="activeLayer" checked><h4>'+ fileName +'</h4><select id="pointsList" name="points"><option disabled selected>ID</option></select><a href="#" class="zoom"><i class="fa-solid fa-magnifying-glass"></i></a>'
      divLayerGrp.appendChild(div);
  
      var src = new ol.source.Vector({
        wrapX: false,
      });
    
      const vecStyle = new ol.style.Style({
        image: new ol.style.Circle({
            radius: 5,
            fill: new ol.style.Fill({ color: "green" }),
            stroke: new ol.style.Stroke({ color: 'black', width: 2 })
        })
        
      });
      const labelStyle = new ol.style.Style({
        text: new ol.style.Text({
          font: '13px Calibri,sans-serif',
          fill: new ol.style.Fill({
            color: '#000',
          }),
          stroke: new ol.style.Stroke({
            color: '#fff',
            width: 4,
          }),
          offsetX:0,
          offsetY:-13,
        }),
      });
  
      const style = [vecStyle, labelStyle];
      const vectorLayer = new ol.layer.Vector({
          source: src,
          title:fileName,
          style: function (feature) {
            const label = feature.get('id');
            labelStyle.getText().setText(label);
            return style;
          },
          
      });
      var reader = new FileReader();
      reader.readAsText(file);
      reader.onload = function(event){
        var csvData= event.target.result;
        var rowData = csvData.split('\n');
        var select = $('#pointsList')[0];
        console.log(select)
        for(let i = 1;i<rowData.length; i++){
          var colData = rowData[i].split(';');
          if ( colData[0] !== "" && colData[1] !== "" && colData[2] !== ""){
            var option = document.createElement("option");
            option.value = colData[0];
            option.text = colData[0];
            select.add(option);
  
            src.addFeature(new ol.Feature({
              id:colData[0],
              geometry: new ol.geom.Point(ol.proj.fromLonLat([parseFloat(colData[1]),parseFloat(colData[2])]))
            }))
      
          }
        }
        map.addLayer(vectorLayer);
      }
  
      
      layerList[0].appendChild(divLayerGrp);
  }
  
  function addTXT(file){
    const fileName = file.name;
    const layerList = document.getElementsByClassName('layerList');
    let divLayerGrp = document.createElement('div');
    divLayerGrp.className = 'layerGroup';
    let div = document.createElement('div');
    div.className = 'layer';
    div.attributes['name'] = file.name;
    div.innerHTML = '<input type="checkbox" name="'+file.name+'" class="activeLayer" checked><h4>'+ fileName +'</h4><select id="pointsList" name="points"><option disabled selected>ID</option></select><a href="#" class="zoom"><i class="fa-solid fa-magnifying-glass"></i></a>'
    divLayerGrp.appendChild(div);
  
    var src = new ol.source.Vector({
      wrapX: false,
    });
  
    const vecStyle = new ol.style.Style({
      image: new ol.style.Circle({
          radius: 5,
          fill: new ol.style.Fill({ color: "red" }),
          stroke: new ol.style.Stroke({ color: 'black', width: 2 })
      })
      
    });
    const labelStyle = new ol.style.Style({
      text: new ol.style.Text({
        font: '13px Calibri,sans-serif',
        fill: new ol.style.Fill({
          color: '#000',
        }),
        stroke: new ol.style.Stroke({
          color: '#fff',
          width: 4,
        }),
        offsetX:0,
        offsetY:-13,
      }),
    });
    const style = [vecStyle, labelStyle];
    const vectorLayer = new ol.layer.Vector({
        source: src,
        title:fileName,
        style: function (feature) {
          const label = feature.get('id');
          labelStyle.getText().setText(label);
          return style;
        },
        
    });
    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(event){
      var txtData= event.target.result;
      var rowData = txtData.split('\n');
      var select = $('#pointsList')[0];
      for(let i = 1;i<rowData.length; i++){
        var colData = rowData[i].split('\t');
        if ( colData[0] !== "" && colData[1] !== "" && colData[2] !== ""){
          var option = document.createElement("option");
          option.value = colData[0];
          option.text = colData[0];
          
          select.add(option);
  
          src.addFeature(new ol.Feature({
            id:colData[0],
            geometry: new ol.geom.Point(ol.proj.fromLonLat([parseFloat(colData[1]),parseFloat(colData[2])]))
          }))
          
        }
      }
      map.addLayer(vectorLayer);
    }

    layerList[0].appendChild(divLayerGrp);
  }
    $('#points').change(function(){
      let pointsFileInput = document.getElementById('points');
      const fileExt = pointsFileInput.files[0].name.split('.').pop();
      if( fileExt === 'csv'){
        addCSV(pointsFileInput.files[0]);
      }
      else if ( fileExt === 'txt'){
        addTXT(pointsFileInput.files[0]);
      }
    });

    // Zoom to Point
    $(document).ready(function(){
      $(document).on('change','#pointsList',function(e){
        var layers = map.getLayers();
        console.log(e.target.previousElementSibling.innerHTML)
        layers.forEach((layer)=>{
          if(layer.get('title')=== e.target.previousElementSibling.innerHTML){
            layer.getSource().getFeatures().forEach((feat)=>{
              if(feat.get('id') === e.target.selectedOptions[0].value){
                map.getView().animate({center:feat.getGeometry().getCoordinates(),zoom:13, duration: 2000 })
              }
            })
          }
        })
      })
    })












}
