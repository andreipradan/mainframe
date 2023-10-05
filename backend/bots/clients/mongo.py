import logging

import environ
from bson.objectid import ObjectId
from pymongo import MongoClient, UpdateOne

from clients.logs import MainframeHandler

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


def bulk_update(requests, collection="matches"):
    logger.warning("Saving %d objects", len(requests))
    results = get_collection(collection).bulk_write(requests)
    logger.info(
        "Bulk write results:\n"
        "Deleted: %d\n"
        "Inserted: %d\n"
        "Matched: %d\n"
        "Modified: %d\n"
        "Upserted: %d\n",
        results.deleted_count,
        results.inserted_count,
        results.matched_count,
        results.modified_count,
        results.upserted_count,
    )
    return results


def get_collection(name="matches"):
    env = environ.Env()
    url = env("CHALLONGE_DATABASE_URL")
    return MongoClient(host=url)[env("CHALLONGE_DATABASE_NAME")][name]


def get_many(collection,
             order_by=None,
             how=-1,
             silent=True,
             skip=0,
             limit=0,
             **kwargs):
    result = get_collection(collection).find(kwargs, skip=skip, limit=limit)
    if order_by:
        return result.sort(order_by, how)
    if not silent and not result:
        raise ValueError(f'No stats found in "{collection}" with {kwargs}')
    return result


def get_stats(collection, silent=False, **kwargs):
    logger.info('Getting stats (%s) from collection "%d"', kwargs, collection)
    if not kwargs:
        raise ValueError("filter kwargs required")
    if "_id" in kwargs:
        kwargs["_id"] = ObjectId(kwargs["_id"])
    stats = get_collection(collection).find_one(kwargs)
    if stats:
        stats.pop("_id")
    elif not silent:
        raise ValueError(f'No stats found in "{collection}" with {kwargs}')
    return stats


def filter_by_ids(ids):
    return list(get_collection().find({"id": {"$in": ids}}, sort=[("id", 1)]))


def set_stats(stats, commit=True, collection="matches", **filter_kwargs):
    if not filter_kwargs:
        raise ValueError("filter kwargs required")

    update_params = {
        "filter": filter_kwargs,
        "update": {
            "$set": stats
        },
        "upsert": True,
    }
    if not commit:
        return UpdateOne(**update_params)

    return get_collection(collection).update_one(**update_params)
