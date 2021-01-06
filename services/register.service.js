const express = require('express');

const Collection = require('../models/payload').Payload;
const Logging = require('../models/payload').PayloadLogging;
const SDCard = require('../models/payload').SDCard;

module.exports = () => {
    // ======
    // Routes
    // ======

    const histories = (req, res, next) => {
        const { _id } = req.params;

        Collection.findById(_id).populate({ path: 'histories', populate: ['payload', 'sdCardId']})
            .exec((e, result) => {
            if (e) {
                next(e)
            } else if (!result || !result.type){
                next(new Error("Can't find any payload. Please check again"));
            } else {
                res.send(result.histories);
            }
        });
    }

    const allHistories = (req, res, next) => {

        // Collection.find({}).populate({ path: 'histories', populate: ['payload', 'sdCardId']}).exec((e, result) => {
        //     if (e) {
        //         next(e)
        //     } else {
        //         res.send(result.map( (item) => item.histories))
        //     }
        // });
        Logging.find({}).populate(['payload', 'sdCardId']).exec((e, results) => {
            if (e) {
                next(e)
            } else {
                res.send(results.filter((item) => { 
                    return item.payload != null && item.payload.type != null
                }));
            }
        })
    }

    const registerFixing = async (req, res, next) => {
        const { _id } = req.params;
        const { reason } = req.body;

        let data = {
            payload: _id,
            startedAt: new Date().toISOString(),
            type: 'fixing',
            reason: reason
        }
        try {
            let payload = await Collection.findOne({ _id: _id, status: "idle" })
            if (payload == null) {
                throw new Error("This payload is not idle. Please check again");
            }
            let log = await Logging.create(data)
            Collection.updateOne({ _id: _id }, { $set: { status: 'fixing' }, $addToSet: { histories: log._id } }, (e) => {
                if (e)
                    next(e)
                else
                    res.sendStatus(200);
            });
        } catch (error) {
            next(error)
        }
    }

    const registerCharging = async (req, res, next) => {
        const { _id } = req.params;

        let data = {
            payload: _id,
            startedAt: new Date().toISOString(),
            type: 'charging',
            reason: ''
        }
        try {
            let payload = await Collection.findOne({ _id: _id, status: "idle" })
            if (payload == null) {
                throw new Error("This payload is not idle. Please check again");
            }
            let log = await Logging.create(data)
            Collection.updateOne({ _id: _id }, { $set: { status: 'charging' }, $addToSet: { histories: log._id } }, (e) => {
                if (e)
                    next(e)
                else
                    res.sendStatus(200);
            });
        } catch (error) {
            next(error)
        }
    }

    const registerDrone = async (req, res, next) => {
        const { _id } = req.params;
        let { reason, droneId, sdCardId, configs } = req.body;

        let sdcard = await SDCard.aggregate([{ $sample: { size: 1 } }]);

        if (droneId == null) {
            next(new Error("droneId is required"));
        }

        if (sdCardId == null) {
            sdCardId = sdcard[0]
        }

        let data = {
            payload: _id,
            startedAt: new Date().toISOString(),
            type: 'working',
            droneId: droneId,
            sdCardId: sdCardId,
            reason: reason
        }

        try {
            let payload = await Collection.findOne({ _id: _id, status: "idle" })
            if (payload == null) {
                throw new Error("This payload is not idle. Please check again");
            }
            let log = await Logging.create(data)
            Collection.updateOne({ _id: _id }, { $set: { status: 'working',droneId: droneId, configs: (configs || []) }, $addToSet: { histories: log._id } }, (e) => {
                if (e)
                    next(e)
                else
                    res.sendStatus(200);
            });
        } catch (error) {
            next(error)
        }
    }

    const returnPayload = async (req, res, next) => {
        const { _id } = req.params;
        let { fee } = req.body;

        if (fee == null) {
            fee = 0;
        }

        try {
        let payload = await Collection.findOne({ _id: _id, status: 'idle'})
        if (payload) {
            throw new Error("This payload is idling");
        }
        await Logging.updateOne({payload: _id, finishedAt: null}, { $set: {finishedAt: new Date().toISOString(), fee: fee }})

        Collection.updateOne({ _id: _id }, {$set: { status: 'idle' }}, (e) => {
            if (e)
                next(e)
            else
                res.sendStatus(200);
        });
        } catch (error) {
            next(error)
        }
    }

    const chargeDone = async (req, res, next) => {
        const { _id } = req.params;

        try {
        let payload = await Collection.findOne({ _id: _id, status: 'charging'})
        if (!payload) {
            throw new Error("This payload is not charging");
        }
        await Logging.updateOne({payload: _id, finishedAt: null}, { $set: {finishedAt: new Date().toISOString(), fee: 0 }})
        Collection.updateOne({ _id: _id }, {$set: { status: 'idle' }}, (e) => {
            if (e)
                next(e)
            else
                res.sendStatus(200);
        });
        } catch (error) {
            next(error)
        }
    }

    const updateFee = async (req, res, next) => {
        const { _id } = req.params;
        const { fee } =  req.body;

        if (!fee) {
            next(new Error("Fee is required"));
            return;
        }

        Logging.updateOne({_id: _id}, { $set: { fee: fee}}, (e) => {
            if (e)
                next(e)
            else
                res.sendStatus(200);
        })
    }

    const config = async (req, res, next) => {
        const { _id } = req.params;
        const { configs } =  req.body;

        if (!configs || !(Array.isArray(configs) && configs.length > 0)) {
            next(new Error("configs field is required and an array"));
            return;
        }

        let payload = await Collection.findOne({_id: _id, status: "working"});
        if (!payload) {
            next(new Error("Payload is not carried by any drone"));
            return;
        }

        Collection.findByIdAndUpdate(_id, {$set: {configs: configs}}, (e) => {
            if (e)
                next(e)
            else
                res.sendStatus(200);
        })
    }

    let router = express.Router();

    router.get('/allHistories', allHistories);
    router.get('/histories/:_id', histories);
    router.post('/fix/:_id', registerFixing);
    router.post('/working/:_id', registerDrone);
    router.post('/return/:_id', returnPayload);
    router.post('/charge/:_id', registerCharging);
    router.post('/chargeDone/:_id', chargeDone);
    router.put('/updateFee/:_id', updateFee);
    router.put('/config/:_id', config);

    return router;

}