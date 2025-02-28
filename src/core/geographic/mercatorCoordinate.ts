export class MercatorCoordinate {

    static mercatorXfromLon(lon: number) {

        return (180. + lon) / 360.
    }

    static mercatorYfromLat(lat: number) {

        return (180. - (180. / Math.PI * Math.log(Math.tan(Math.PI / 4. + lat * Math.PI / 360.)))) / 360.
    }

    static fromLonLat(lonLat: [number, number]) {

        const x = MercatorCoordinate.mercatorXfromLon(lonLat[0])
        const y = MercatorCoordinate.mercatorYfromLat(lonLat[1])

        return [x, y]
    }

    static toNDC(coords: [number, number]) {

        // if (coords[0] > 1.0 || coords[0] < 0.0 || coords[1] > 1.0 || coords[1] < 0.0)

        return [
            coords[0] * 2. - 1.,
            1. - coords[1] * 2.
        ]
    }

    static lonFromMercatorX(x: number) {

        return x * 360. - 180.
    }

    static latFromMercatorY(y: number) {

        const y2 = 180.0 - y * 360.0
        return 360.0 / Math.PI * Math.atan(Math.exp(y2 * Math.PI / 180.0)) - 90.0
    }

    static fromXY(xy: [number, number]) {

        const [x, y] = xy;
        const lon = MercatorCoordinate.lonFromMercatorX(x)
        const lat = MercatorCoordinate.latFromMercatorY(y)
        return [lon, lat]
    }

    static fromNDC(xy: [number, number]) {

        let [x, y] = xy
        x = (x + 1.) / 2.
        y = (1. - y) / 2.
        return MercatorCoordinate.fromXY([x, y])
    }
}