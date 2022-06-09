from pymongo import MongoClient

DB_URI='mongodb://localhost:27017'
DB_NAME='DefiHubDB'

ACTION_CONFIGS = {
    "swaps": {

    },
    "vaults": {

    },
    "lendings": {

    }
}

def main():
    client = MongoClient(DB_URI)
    db = client.get_database(DB_NAME)
    collections = db.list_collection_names()

    print(DB_NAME, collections)
    strategies = db.get_collection('strategies')

    print('Process', 'strategies', strategies.estimated_document_count())
    for item in strategies.find():
        for action in item['farmingActions']:
            print(action['method'])

    client.close()

if __name__ == "__main__":
    main()

