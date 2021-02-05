sap.ui.define([
	"sap/m/MessageBox"
], function (MessageBox) {
	"use strict";

	return {

		_version: 0,
		_dbName: "CSB",
		_DB: window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB,
		_upgradeDBNeeded: false,
		_objectStores: {},

		checkAvailability: function () {
			if (!this._DB) {
				return false;
			} else {
				return true;
			}
		},

		/**
		 * Opens DB
		 * @_version : updated and saved for further use
		 */
		init: function () {
			return new Promise(function (resolve, reject) {
				var request = this._DB.open(this._dbName);

				function fnDB(e) {
					var db = e.target.result;
					this._version = db.version;
					this._objectStores = db.objectStoreNames;
					resolve(db);
					// db.close();
				}

				function fnDBErr(err) {
					reject(err);
				}

				request.onupgradeneeded = fnDB.bind(this);
				request.onsuccess = fnDB.bind(this);
				request.onerror = fnDBErr.bind(this);

			}.bind(this));
		},

		_upgrade: function (arr) {
			return new Promise(function (resolve, reject) {

				var request = this._DB.open(this._dbName, this._version + 1);
				request.onupgradeneeded = function (event) {
					// Save the IDBDatabase interface
					var db = event.target.result;
					var aEntities = arr;
					this._version = db.version;
					this._objectStores = db.objectStoreNames;

					//Store the entities and theirs properties
					aEntities.mapping.forEach(function (entity) {
						var sOS = entity.entitySet,
							sEntityType = entity.entityType,
							oOS; //str ObjectStore Name
						if (!db.objectStoreNames.contains(sOS)) {
							if (aEntities[sEntityType].key.length < 2) {
								oOS = db.createObjectStore(sOS, { //create ObjectStore
									keyPath: aEntities[sEntityType].key[0]
								});
							} else {
								oOS = db.createObjectStore(sOS, { //create ObjectStore
									keyPath: aEntities[sEntityType].key
								});
							}

							aEntities[sEntityType].property.forEach(function (index) {
								oOS.createIndex(index, index, {
									unique: false
								});
							});
						}
					});

					//store the mapping used for combobox
					var sMapping = "mappings",
						sKeyPath = "key";

					if (!db.objectStoreNames.contains(sMapping)) {
						var oOS = db.createObjectStore(sMapping, { //create ObjectStore
							keyPath: sKeyPath,
							autoIncrement: true
						});
					}

					this._upgradeDBNeeded = false;
					resolve(db);
				}.bind(this);
				request.onsuccess = function (event) {
					event.target.result.close();
					resolve(event);
				};
				request.onerror = function (err) {
					event.target.result.close();
					reject(err);
				};

			}.bind(this));

		},

		/**
		 * 
		 * @param {string} sOS the object store name
		 * @param {string} sName the model name
		 * @returns {Promise} the promise of a new value
		 */
		getAllDataForSet: function (sOS) {
			return new Promise(function (resolve, reject) {

				var db;
				var request = this._DB.open(this._dbName, this._version);
				request.onsuccess = function (event) {
					db = event.target.result;

					//check if ObjectStore already defined
					if (db.objectStoreNames.contains(sOS)) {
						var tx = db.transaction(sOS, 'readonly'); //transaction, @str: String
						var store = tx.objectStore(sOS); //store

						store.getAll().onsuccess = function (e) { //get all function for store
							resolve(e.target.result);
						};
					} else {
						this._updateDB = true;
						reject();
					}
					db.close(); //close db
				}.bind(this);

			}.bind(this));
		},

		putData: function (aData, sOS) {
			return new Promise(function (resolve, reject) {
				var db;
				var request = this._DB.open(this._dbName, this._version);
				request.onsuccess = function (event) {
					db = event.target.result; //database
					var tx = db.transaction([sOS], 'readwrite'); //transaction, @sOS: String ObjectStore

					aData.forEach(function (element) {
						var store = tx.objectStore(sOS).put(element);
					});

					tx.oncomplete = function (event) {
						resolve(aData);
						db.close();
					};

					tx.onerror = function (event) {
						db.close();
					};

				};
				request.onerror = function (event) {
					var error = ("Database error: " + event.target.errorCode);
					reject(error);
				};

			}.bind(this));
		},

		syncAll: function (aData) {
			var dfd = new $.Deferred();
			var aDef = [];
			var db;

			aData.forEach(function (obj, index) {
				var request = this._DB.open(this._dbName, this._version);

				request.onsuccess = function (event) {
					db = event.target.result;

					aDef[index] = new $.Deferred();
					var tx = db.transaction([obj.entity.entitySet], "readwrite");

					obj.results.forEach(function (elem) {
						tx.objectStore(obj.entity.entitySet).put(elem);
					});

					tx.oncomplete = function (event) {
						aDef[index].resolve();
						db.close();
					};

					return aDef[index].promise();

				};
			}.bind(this));

			$.when.apply($, aDef).done(function () {
				dfd.resolve();
			});

			return dfd.promise();
		}

	};
});