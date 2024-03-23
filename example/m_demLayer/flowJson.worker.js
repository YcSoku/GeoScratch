import axios from 'axios'
import { Delaunay } from 'd3-delaunay'
import * as scr from '../../src/scratch.js'

self.addEventListener('message', (event) => {

  const { url } = event.data
  parseStations(url)
})

async function parseStations(url) {

  const res = await axios.get(url)
  const { maxSpeed, indices, attributes } = triangulate(res.data.stations)
  self.postMessage({
    url,
    maxSpeed,
    indices,
    attributes
  })
}

function encodeFloatToDouble(value) {

    const result = new Float32Array(2);
    result[0] = value;
    
    const delta = value - result[0];
    result[1] = delta;
    return result;
}

function triangulate(data) {

    const vertices = []
    data.forEach(station => {
        vertices.push(station.lon)
        vertices.push(station.lat)
    })
    const meshes = new Delaunay(vertices)

    let maxSpeed = 0.0
    const attributes = []
    for (let i = 0; i < meshes.points.length; i += 2) {

        const station = data[Math.floor(i / 2)]
        const x = encodeFloatToDouble(scr.MercatorCoordinate.mercatorXfromLon(meshes.points[i + 0]))
        const y = encodeFloatToDouble(scr.MercatorCoordinate.mercatorYfromLat(meshes.points[i + 1]))

        attributes.push(x[0])
        attributes.push(y[0])
        attributes.push(x[1])
        attributes.push(y[1])
        attributes.push(station.u)
        attributes.push(station.v)

        const speed = Math.sqrt(station.u * station.u + station.v * station.v)
        maxSpeed = speed > maxSpeed ? speed : maxSpeed
    }
    
    return { maxSpeed, indices: meshes.triangles, attributes }
}
  