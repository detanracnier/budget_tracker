const FILES_TO_CACHE = [
    "index.html",
    "styles.css",
    "icons/icon-192x192.png",
    "icons/icon-512x512.png"
];

const CACHE_NAME = "static-cache";

const DATA_CACHE_NAME = "data-cache";

self.addEventListener("install", function (evt) {
    // this should grab all of the transactions from the DB and cache them
    evt.waitUntil(
        caches.open(DATA_CACHE_NAME).then((cache) => cache.add("/api/transaction"))
    );

    // pre cache all static assets
    evt.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
    );

    // tell the browser to activate this service worker immediately once it
    // has finished installing
    self.skipWaiting();
});


self.addEventListener("activate", function (evt) {
    // When activated remove all caches that are not the named caches above
    evt.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(
                keyList.map(key => {
                    if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
                        console.log("Removing old cache data", key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );

    self.clients.claim();
});

self.addEventListener('fetch', function (evt) {
    // If the fetch is an API call
    if (evt.request.url.includes("/api/")) {
        console.log("[Service Worker] Fetch (data)", evt.request.url);

        // intercept the API call and add the data from the call to the DATA_CACHE
        // then return the response to the fetch
        evt.respondWith(
            caches.open(DATA_CACHE_NAME).then(cache => {
                return fetch(evt.request)
                    .then(response => {
                        if (response.status === 200) {
                            cache.put(evt.request.url, response.clone());
                        }

                        return response;
                    })
                    .catch(err => {
                        // if the fetch fails to get the data check the cache
                        return cache.match(evt.request);
                    });
            })
        )

        return;
    };

    // if the fetch is not an API call respond with cached files/images before requesting them from the server
    evt.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(evt.request).then(response => {
                return response || fetch(evt.request);
            })
        })
    );
});
