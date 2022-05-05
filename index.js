addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request))
})

const getAccessToken = () => {
    return new Promise((resolve, reject) => {
        DATABASE.get("od_web_token", { type: "json" }).then(value => {
            if (value === null) {
                    const data = {} // get your token
                    DATABASE.put("od_web_token", JSON.stringify(data)).then(() => {
                        resolve(data)
                    })

            } else {
                const expired_time = value.expires
                const now_time = new Date().getTime()
                if (now_time >= expired_time) {
                    DATABASE.put("od_web_token", null).then(() => {
                        getAccessToken().then(token => {
                            resolve(token)
                        })
                    })
                } else {
                    resolve(value)
                }
            }
        })

    })
}

const getFileMeta = (token, pathname) => {

    let path = "/testweb" + pathname

    console.log("try load " + path)

    return new Promise((resolve, reject) => {
        fetch("https://graph.microsoft.com/v1.0/me/drive/root:" + path, {
            headers: {
                'Authorization': 'bearer ' + token.access_token
            }
        }).then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    console.log("File Not Found")
                    getFileMeta(token, "/index.html").then(data => {
                        console.log(data)
                        resolve(data)
                    }).catch(e => {
                        reject("Not Found 404 Page")
                    })
                } else {
                    reject("Server Error " + response.status)
                }

            } else {
                response.json().then(data => {
                    if ('file' in data) {
                        resolve({
                            url: data["@microsoft.graph.downloadUrl"],
                            type: data.file.mimeType,
                            length: data.size
                        })
                    } else {
                        reject("Not Single File")
                    }
                })
            }
        }).catch(e => {
            console.log(e)
        })
    })
}

async function handleRequest(request) {
    let pathname = new URL(request.url).pathname

    if (pathname === "/") {
        pathname = "/index.html"
    }

    const token = await getAccessToken()

    const meta = await getFileMeta(token, pathname)

    let content = await fetch(meta.url)

    let response = new Response(content.body, {
        headers: {
            "content-type": meta.type
        }
    })

    return response
}
