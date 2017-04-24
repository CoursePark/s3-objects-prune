'use strict';

function promisify(object, fnc, param) {
	return new Promise((resolve, reject) => {
		fnc.call(object, param, (err, data) => {
			if (err) {
				reject(err);
			 }
			 else {
				resolve(data);
			 }
		});
	});
}

// get a set of object keys from an s3 bucket
function listKeys(s3, prefix) {
	return promisify(s3, s3.listObjects, {Prefix: prefix})
		.catch((err) => {
			throw Object({message: `s3 list objects failed ${err.message}`});
		})
		.then((data) => data.Contents.map((x) => x.Key))
	;
}

// delete a set of object keys from an s3 bucket
function deleteKeys(s3, keySet) {
	if (keySet.length === 0) {
		return Promise.resolve();
	}
	const param = {
		Delete: {
			Objects: keySet.map((x) => ({Key: x})),
			Quiet: true,
		},
	};
	return promisify(s3, s3.deleteObjects, param)
		.catch((err) => {
			throw Object({message: `s3 delete objects failed ${err.message}`});
		})
		.then(() => undefined)
	;
}

const S3 = require('aws-sdk/clients/s3');

const s3 = new S3({
	region: process.env.S3_OBJ_PRUNE_AWS_REGION === 's3'
		? 'us-east-1'
		: process.env.S3_OBJ_PRUNE_AWS_REGION
	,
	credentials: {
		accessKeyId: process.env.S3_OBJ_PRUNE_AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.S3_OBJ_PRUNE_AWS_SECRET_ACCESS_KEY,
	},
	params: {
		Bucket: process.env.S3_OBJ_PRUNE_AWS_BUCKET,
	},
});

const prefix = process.env.S3_OBJ_PRUNE_AWS_OBJECT_PREFIX;
const maxKeys = Number.parseInt(process.env.S3_OBJ_PRUNE_MAX_OBJECTS, 10);

function objectKeyToTimestamp(key) {
	return (new Date(key.replace(prefix, '').replace('.dump', '').replace('_', 'T'))).valueOf();
}

// main
Promise.resolve()
	.then(() => listKeys(s3, prefix))
	// reduce to keys to delete
	.then((unfilteredKeyList) => {
		// reduce to an ordered list of valid timestamp keys
		const keyList = unfilteredKeyList.filter(objectKeyToTimestamp).sort();

		// identify surplus keys
		const young = objectKeyToTimestamp(keyList[keyList.length - 1]);
		const old = objectKeyToTimestamp(keyList[0]);

		const surplusKeyList = [];
		const numSets = Math.ceil(maxKeys / 2);
		for (let i = 1; i < numSets; i++) {
			const oldBoundary = Math.log(i) / Math.log(numSets) * (young - old) + old;
			const youngBoundary = Math.log(i + 1) / Math.log(numSets) * (young - old) + old;
			const setList = keyList
				.filter((key) => objectKeyToTimestamp(key) >= oldBoundary)
				.filter((key) => objectKeyToTimestamp(key) <= youngBoundary)
			;
			for (let j = 1; j < setList.length - 1; j++) {
				surplusKeyList.push(setList[j]);
			}
		}

		const numDelete = keyList.length > maxKeys ? keyList.length - maxKeys : 0;
		// from the surplus select the oldest that are excessive
		console.log(`s3 objects prune - ${keyList.length} objects, ${maxKeys} max, ${numDelete} to be deleted`);
		return surplusKeyList.slice(0, numDelete);
	})
	// delete keys
	.then((deleteKeyList) => deleteKeys(s3, deleteKeyList))
	.then(() => {
		console.log('s3 objects prune - complete');
	})
	.catch((err) => {
		console.error(`s3 objects prune - ${err.message}`);
	})
;
