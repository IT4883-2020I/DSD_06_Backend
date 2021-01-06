const express = require('express');
const axios = require('axios');

const Collection = require('../models/payload').Payload;
const Logging = require('../models/payload').PayloadLogging;

const dedieuObjects = ["Đê Sông Hồng, km"]

module.exports = () => {

    const randomDeDieu = () => {
        let km = Math.floor(Math.random() * 101);

        return `Đê Sông Hồng, km ${km}`;
    }

    const randomDien = () => {
        let km = Math.floor(Math.random() * 101);

        return `Cột điện số ${km}`;
    }

    const randomRung = () => {
        let km = Math.floor(Math.random() * 101);

        return `Khu vực rừng số ${km}`;
    }

    const randomCayTrong = () => {
        let items = ["Chè", "Dâu tây", "Nho", "Hoa tulip"];
        var item = items[Math.floor(Math.random() * items.length)];

        return `Khu trồng ${item}`;
    }

    const randomDayDien = () => {
        let km = Math.floor(Math.random() * 200);

        return `Dây điện, km số ${km}`;
    }
 
    const getMetadata = async (req, res, next) => {
        const { _id } = req.params;
        const { project_type } = req.query;
        // 'DE_DIEU', 'CAY_TRONG', 'CHAY_RUNG', 'LUOI_DIEN'
        var objective = ""
        switch (project_type) {
            case 'DE_DIEU':
                objective = randomDeDieu();
                break;
            case 'CAY_TRONG':
                objective = randomCayTrong();
                break;
            case 'CHAY_RUNG':
                objective = randomRung();
                break;
            default:
                objective = randomDien();
        }
        let payload = await Collection.findOne({_id: _id, status: "working"})
        let log = await Logging.findOne({payload: payload.id, finishedAt: null})
        if (!payload || !log) {
            next(new Error("This payload is not working. Please try later"));
            return;
        }
        let droneId = log.droneId || '5fbdb9e94e0fc003db237c99'
        let droneMeta = await axios.get(`http://skyrone.cf:6789/droneState/getParameterFlightRealTime/${droneId}/`);

        res.json({
            object: droneMeta.data,
            config: {
                panning: Math.floor(Math.random() * 341),
                tilting: Math.floor(Math.random() * 111),
                zoom: Math.floor(Math.random() * 11),
                autoTracking: Boolean(Math.floor(Math.random() * 101) % 2),
                shotInterval: Math.floor(Math.random() * 11) * 1000
            }
        })
    }

    const getImage = async (req, res, next) => {
        const { _id } = req.params;
        const { project_type } = req.query;

        let droneRequest = await axios.get('http://54.251.160.65:6789/droneState/getAllDroneActiveRealTime')
        var bakDroneId = ''
        if (Array.isArray(droneRequest.data) && droneRequest.data.length > 0) {
            bakDroneId = droneRequest.data[Math.floor(Math.random() * droneRequest.data.length)].idDrone
        }
        
        let payload = await Collection.findOne({_id: _id, status: "working"})
        let log = await Logging.findOne({payload: _id, finishedAt: null})
        if (!payload || !log) {
            next(new Error("This payload is not working. Please try later"));
            return;
        }
        let droneId = log.droneId
        if (!droneId) {
            next(new Error("Can't find drone. Please check again"));
            return;
        }

        var arr = []
        var min = 1, max = 1;
        var id = ''
        switch (project_type) {
            case 'DE_DIEU':
                max = 100
                id = 'v1607437240/de-dieu/de-dieu'
                break;
            case 'CAY_TRONG':
                max = 77;
                id = 'v1607244077/cay-trong/cay-trong'
                break;
            case 'CHAY_RUNG':
                max = 110;
                id = 'v1607243994/chay-rung/chay-rung'
                break;
            default:
                max = 104
                id = 'v1606833551/luoi-dien/day-dien'
        }

        for (var i = min; i <= Math.min(max, 10); i++) {
            let number = Math.floor(Math.random() * max);
            var url = `https://res.cloudinary.com/webtt20191/image/upload/${id}-${number}.jpg`
            let droneMeta = await axios.get(`http://skyrone.cf:6789/droneState/getParameterFlightRealTime/${droneId}/`);
            var objective = droneMeta.data.data
            // if (!objective) {
            //     droneMeta = await axios.get(`http://skyrone.cf:6789/droneState/getParameterFlightRealTime/${bakDroneId}/`);
            //     droneId = bakDroneId
            //     objective = droneMeta.data.data
            // }
            
            if (!objective) {
                next(new Error("Drone is not working. Please check again"));
                return;
            }
            objective.idDrone = droneId
            let data = {
                image: url,
                object: objective,
                config: {
                    panning: Math.floor(Math.random() * 341),
                    tilting: Math.floor(Math.random() * 111),
                    zoom: Math.floor(Math.random() * 11),
                    autoTracking: Boolean(Math.floor(Math.random() * 101) % 2),
                    shotInterval: Math.floor(Math.random() * 11) * 1000
                }
            }
            arr.push(data)
        }

        res.json(arr)
    }

    let router = express.Router();
    
    router.get('/metadata/:_id', getMetadata);
    router.get('/image/:_id', getImage)

    return router;
}