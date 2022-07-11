import sys, json
import web3
import eth_utils
from web3.auto import w3
from pymongo import MongoClient

CHAIN_IDS = [56]
DB_URI = 'mongodb://localhost:27017'
DB_NAME = 'DefiHubDB'

CONFIG = dict({
})
CONFIG.update(json.load(open('tokens.json')))
CONFIG.update(json.load(open('methods.json')))

class Call:
    def __init__(self, _target: str, _method = '', _params = [], _eth = 0):
        assert _target.startswith('__') or w3.isAddress(_target)
        self.__target = _target
        self.method = _method
        self.params = _params
        self.eth = _eth

    @property
    def target(self):
        return self.__target

    def get(self, maps = {}, name_maps = {}):
        if self.__target in maps:
            self.__target = maps[self.__target]
        return self

    def encode(self):
        data = function_abi_to_4byte_selector(self.method)
        types = []
        data += w3.codec.encode_abi(types, self.params)
        return [self.__target, data, self.eth]

ABI_MAPS = {
}

CONFIG_MAPS = {
}

ACTION_CONFIGS = {
    "swaps": {
        "calls": [
            Call('__', ''),
            Call('__', '')
        ],
        "auto": {
            "calls": [
                Call('__', '')
            ]
        }
    },
    "vaults": {

    },
    "lendings": {

    },
    "borrows": {

    },
    "providinglps": {

    }
}

def printObj(obj):
    print(json.dumps(obj, indent=4, sort_keys=True))

def printErr(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

def actionToCall(action):
    # target, method, params, value
    call = [
    ]
    return call

def main():
    client = MongoClient(DB_URI)
    db = client.get_database(DB_NAME)
    collections = db.list_collection_names()

    print(DB_NAME, collections)
    strategies = db.get_collection('strategies')

    first = True
    arr = []

    print('Process', 'strategies', strategies.estimated_document_count())
    for item in strategies.find():

        if first:
            printObj(item)
            first = False

        for action in item['farmingActions']:
            method = action['method']

    client.close()

if __name__ == "__main__":
    main()

