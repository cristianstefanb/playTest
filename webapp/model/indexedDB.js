sap.ui.define([
	"sap/m/MessageBox"
], function (MessageBox) {
	"use strict";

	return {

		_version: 0,
		_dbName: "CSB",
		_DB: window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB,
		_upgradeDBNeeded: false,
		_idbInstance: "",
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
				var requestDB = this._DB.open(this._dbName);

				function fnDB(e) {
					var db = e.target.result;
					this._idbInstance = db;
					this._version = db.version;
					this._objectStores = db.objectStoreNames;
					resolve(db);
					db.close();
					debugger
				}

				function fnDBErr(err) {
					reject(err);
					this._idbInstance.close();
				}

				requestDB.onupgradeneeded = fnDB.bind(this);
				requestDB.onsuccess = fnDB.bind(this);
				requestDB.onerror = fnDBErr.bind(this);

			}.bind(this));
		},

		_upgrade: function (arr) {
			return new Promise(function (resolve, reject) {
				var init = this.init();
				init.then(function () {
					debugger
					var request = this._DB.open(this._dbName, this._version + 1);
					request.onupgradeneeded = function (event) {
						// Save the IDBDatabase interface
						var db = event.target.result;
						this._idbInstance = db;
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
						db.close();
					}.bind(this);

					request.onsuccess = function (event) {
						this._idbInstance.close();
						resolve(event);
					}.bind(this);

					request.onerror = function (err) {
						this._idbInstance.close();
						reject(err);
					}.bind(this);

				}.bind(this));

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
					debugger
					db = event.target.result;
					this._idbInstance = db;

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

				request.onerror = function (e) {
					reject(e);
					this._idbInstance.close();
				}.bind(this);

			}.bind(this));
		},

		putData: function (aData, sOS) {
			return new Promise(function (resolve, reject) {
				var db;
				var request = this._DB.open(this._dbName, this._version);
				request.onsuccess = function (event) {
					db = event.target.result; //database
					this._idbInstance = db;
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
					this._idbInstance.close();

				}.bind(this);

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
					this._idbInstance = db;

					aDef[index] = new $.Deferred();
					var tx = db.transaction([obj.entity.entitySet], "readwrite");

					obj.results.forEach(function (elem) {
						tx.objectStore(obj.entity.entitySet).put(elem);
					});

					tx.oncomplete = function (event) {
						aDef[index].resolve();
						db.close();
					};

					tx.onerror = function (event) {
						db.close();
					};

					return aDef[index].promise();
				};

				request.onerror = function (event) {
					aDef[index].reject(event.target.errorCode);
					this._idbInstance.close();
				}.bind(this);

			}.bind(this));

			$.when.apply($, aDef).done(function () {
				dfd.resolve();
				this._idbInstance.close();
			}.bind(this));

			return dfd.promise();
		},

		deleteDB: function () {
			return new Promise(function (resolve, reject) {
				var DBDeleteRequest = this._DB.deleteDatabase(this._dbName);

				DBDeleteRequest.onerror = function (event) {
					reject();
				};
				DBDeleteRequest.onsuccess = function (event) {
					console.log(event.result); // should be undefined
					resolve();
				};
				DBDeleteRequest.onblocked = function (e) {
					reject("blocked: " + e);
				};

			}.bind(this));
		},
		
		getItem: function(sOS,sKey) {
			return new Promise(function(resolve,reject){
				var request = this._DB.open(this._dbName, this._version);
				var db;
				
				request.onsuccess = function(event){
					db = event.target.result;
					this._idbInstance = db;

					//check if ObjectStore already defined
					if (db.objectStoreNames.contains(sOS)) {
						var tx = db.transaction(sOS, 'readonly'); //transaction, @str: String
						var store = tx.objectStore(sOS); //store

						store.get(sKey).onsuccess = function (e) { //get all function for store
							resolve(e);
						};
					} else {
						this._updateDB = true;
						reject();
					}
					db.close(); //close db
				}.bind(this);
			}.bind(this));
		}
		
		

	};
});