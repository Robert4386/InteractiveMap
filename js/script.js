// Инициализация Карты
const map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM(),
        }),
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([31.1656, 48.3794]),
        zoom: 6,
    }),
});

// Создание слоя для заливки внутри границ Украины
const fillLayer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 0, 0, 0.3)', // Прозрачный красный цвет
        }),
        stroke: new ol.style.Stroke({
            color: 'rgba(255, 0, 0, 0.8)', // Красная обводка границ
            width: 2,
        }),
    }),
});

// Отключение обработки кликов для этого слоя
fillLayer.set('clickable', false);

// Создание слоя для заливки новых областей
const newAreasLayer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(0, 0, 255, 0.3)', // Прозрачный синий цвет для заливки
        }),
        stroke: new ol.style.Stroke({
            color: 'rgba(0, 0, 255, 0.8)', // Синяя обводка границ
            width: 2,
        }),
    }),
});

// Отключение обработки кликов для этого слоя
newAreasLayer.set('clickable', false);

// Добавление слоев на карту
map.addLayer(fillLayer); // Заливка Украины
map.addLayer(newAreasLayer); // Заливка новых областей

// Загрузка GeoJSON файла для границ Украины
const loadGeoJSON = (fileName) => {
    console.log('Loading GeoJSON file:', fileName);
    fetch(fileName)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            return response.json();
        })
        .then(geojson => {
            console.log('GeoJSON data:', geojson);
            const format = new ol.format.GeoJSON();
            const features = format.readFeatures(geojson, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857',
            });
            console.log('Loaded features:', features);

            // Добавляем полигоны границ в слой заливки
            fillLayer.getSource().addFeatures(features);
        })
        .catch(error => {
            console.error('Error loading GeoJSON:', error);
        });
};

// Загрузка GeoJSON файла для новых областей
const loadNewAreasGeoJSON = (fileName) => {
    console.log('Loading New Areas GeoJSON file:', fileName);
    fetch(fileName)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            return response.json();
        })
        .then(geojson => {
            console.log('New Areas GeoJSON data:', geojson);
            const format = new ol.format.GeoJSON();
            const features = format.readFeatures(geojson, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857',
            });
            console.log('Loaded new areas features:', features);

            // Добавляем полигоны новых областей в слой
            newAreasLayer.getSource().addFeatures(features);
        })
        .catch(error => {
            console.error('Error loading New Areas GeoJSON:', error);
        });
};

// Укажите имена ваших GeoJSON файлов
const geoJSONFileName = 'boundaries-1.geojson';
const newAreasGeoJSONFileName = 'boundaries-2.geojson';
loadGeoJSON(geoJSONFileName);
loadNewAreasGeoJSON(newAreasGeoJSONFileName);

// Источник для маркеров
const vectorSource = new ol.source.Vector();

// Создание слоя с пользовательским стилем для маркеров
const markerLayer = new ol.layer.Vector({
    source: vectorSource,
    style: new ol.style.Style({
        image: new ol.style.Icon({
            src: 'images/marker-icon.png', // Укажите правильный путь к вашей иконке
            anchor: [0.5, 0.5], // Центр иконки посередине
            anchorXUnits: 'fraction', // Единицы измерения anchor по X
            anchorYUnits: 'fraction', // Единицы измерения anchor по Y
            scale: 0.10, // Размер иконки (0.10)
            opacity: 1, // Прозрачность
            crossOrigin: 'anonymous', // Для предотвращения проблем CORS
        }),
    }),
    hitTolerance: 5, // Добавляем толерантность кlick'ов (пикселей)
});

// Добавление слоя маркеров на карту
map.addLayer(markerLayer);

// Убедимся, что слой маркеров находится поверх всех остальных слоев
map.getLayers().setAt(map.getLayers().getLength() - 1, markerLayer);

// Координаты Городов
const cities = [
    { name: 'Kyiv', coords: [30.5234, 50.4501] },
    { name: 'Lviv', coords: [24.0297, 49.8397] },
    { name: 'Odessa', coords: [30.7233, 46.4825] },
    { name: 'Kharkiv', coords: [36.2304, 49.9935] },
    { name: 'Dnipro', coords: [35.0462, 48.4647] },
];

// Добавление маркеров для городов
cities.forEach(city => {
    const marker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat(city.coords)),
        name: city.name,
    });
    vectorSource.addFeature(marker);
});

// Элементы интерфейса
const popup = document.getElementById('popup');
const linkInput = document.getElementById('link-input');
const saveLinkButton = document.getElementById('save-link');
const closePopupButton = document.getElementById('close-popup');
const contextMenu = document.getElementById('context-menu');
const addLinkButton = document.getElementById('add-link');
const viewPostButton = document.getElementById('view-post');
const deleteMarkerButton = document.getElementById('delete-marker');
let currentMarker = null;
let selectedFeature = null;

// Обработчик клика на карте
map.on('click', function (event) {
    // Проверяем, есть ли фича под курсором
    const feature = map.forEachFeatureAtPixel(event.pixel, function (feature) {
        return feature;
    }, {
        layerFilter: function (layer) {
            // Игнорируем все слои, кроме слоя маркеров
            return layer === markerLayer;
        }
    });

    if (feature) {
        // Если клик на маркере, показываем контекстное меню
        selectedFeature = feature;
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${event.pixel[0]}px`;
        contextMenu.style.top = `${event.pixel[1]}px`;
    } else {
        // Если клик на пустом месте, создаем новый маркер
        const coords = ol.proj.toLonLat(event.coordinate);
        const marker = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat(coords)),
        });
        vectorSource.addFeature(marker);
        currentMarker = marker;

        // Показываем popup для ввода ссылки
        popup.style.display = 'block';
        popup.style.left = `${event.pixel[0]}px`;
        popup.style.top = `${event.pixel[1]}px`;
    }
});

// Сохранение ссылки
saveLinkButton.addEventListener('click', function () {
    const link = linkInput.value;
    if (link && currentMarker) {
        currentMarker.set('link', link);
        alert('Ссылка сохранена: ' + link);
        popup.style.display = 'none';
        linkInput.value = '';
    }
});

// Закрытие popup
closePopupButton.addEventListener('click', function () {
    popup.style.display = 'none';
    linkInput.value = '';
    if (currentMarker) {
        vectorSource.removeFeature(currentMarker); // Удаление маркера, если popup закрыт без сохранения
    }
});

// Вставка ссылки через контекстное меню
addLinkButton.addEventListener('click', function () {
    if (selectedFeature) {
        popup.style.display = 'block';
        popup.style.left = contextMenu.style.left;
        popup.style.top = contextMenu.style.top;
        contextMenu.style.display = 'none';
    }
});

// Переход по ссылке
viewPostButton.addEventListener('click', function () {
    const link = selectedFeature.get('link');
    if (link) {
        window.open(link, '_blank'); // Открытие ссылки в новой вкладке
    }
    contextMenu.style.display = 'none';
});

// Удаление маркера
deleteMarkerButton.addEventListener('click', function () {
    if (selectedFeature) {
        vectorSource.removeFeature(selectedFeature); // Удаление маркера
    }
    contextMenu.style.display = 'none';
});

// Скрытие контекстного меню при клике вне маркера
map.on('click', function (event) {
    const feature = map.forEachFeatureAtPixel(event.pixel, function (feature) {
        return feature;
    }, {
        layerFilter: function (layer) {
            // Игнорируем все слои, кроме слоя маркеров
            return layer === markerLayer;
        }
    });

    if (!feature) {
        contextMenu.style.display = 'none';
    }
});