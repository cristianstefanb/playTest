sap.ui.define([
	"./indexedDB"
], function (IndexedDB) {

	return {

		generateXMLDocument: function (e) {
			var dfd = new $.Deferred();
			var oController = e.getOwnerComponent();
			var oModel = oController.getModel("serviceModel");
			var request = oModel.metadataLoaded(true);

			request.then(function (result) {
				var xmlDoc = this._getXMLDoc(result[0]);
				dfd.resolve(xmlDoc);
			}.bind(this));

			return dfd.promise();
		},

		_getXMLDoc: function (metadata) {
			var parser = new DOMParser();

			return parser.parseFromString(metadata.metadataString, "text/xml");
		},

		parseXmlDoc: function (xml) {
			var arr = [];
			arr.mapping = [];

			this._getEntities(xml, arr);
			this._defMapping(xml, arr);

			return arr;
		},

		_getEntities: function (xml, arr) {
			var aElements = xml.getElementsByTagName("EntityType");
			var iNodes = aElements.length;

			for (var i = 0; i < iNodes; i++) {
				var nodeParent = aElements[i];
				var sEntName = nodeParent.getAttribute("Name");
				debugger
				arr[sEntName] = [];
				arr[sEntName].key = [];
				arr[sEntName].property = [];
				var childCount = nodeParent.childElementCount;

				for (var j = 0; j < childCount; j++) {
					var child = nodeParent.children[j];
					if (child.nodeName === "Key") {
						for (var x = 0; x < child.childElementCount; x++) {
							arr[sEntName].key.push(child.children[x].getAttribute("Name"));
						}
					} else if (child.nodeName === "Property") {
						if (arr[sEntName].key.includes(child.getAttribute("Name"))) { //if key 
						} else {
							arr[sEntName].property.push(child.getAttribute("Name"));
						}

					}
				}
				arr[sEntName].property.sort();
			}
		},

		_defMapping: function (xml, arr) {
			var aElements = xml.getElementsByTagName("EntitySet");
			var iNodes = aElements.length;

			for (var i = 0; i < iNodes; i++) {
				var elementSet = aElements[i];
				var obj = {
					entitySet: elementSet.getAttribute("Name"),
					entityType: elementSet.getAttribute("EntityType").slice(15)
				};
				arr.mapping.push(obj);
			}
		},

		_readServerData: function (ctrl, sEntitySet) {
			return new Promise(function (resolve, reject) {
				var oModel = ctrl.getModel("serviceModel");
				oModel.read("/" + sEntitySet, {
					success: function (data, result) {
						var newPromise = IndexedDB.putData(data.results, sEntitySet);
						newPromise.then(function () {
							resolve(data.results);
						});
					}.bind(this)
				});
			}.bind(this));
		},

	};

});