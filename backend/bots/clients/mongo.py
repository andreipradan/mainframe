import logging

import environ
from pymongo import MongoClient, UpdateOne


logger = logging.getLogger(__name__)


def bulk_update(requests, collection="matches"):
    logger.warning(f"Saving {len(requests)} objects")
    results = get_collection(collection).bulk_write(requests)
    logger.info(
        f"Bulk write results:\n"
        f"Deleted: {results.deleted_count}\n"
        f"Inserted: {results.inserted_count}\n"
        f"Matched: {results.matched_count}\n"
        f"Modified: {results.modified_count}\n"
        f"Upserted: {results.upserted_count}\n"
    )
    return results


def get_collection(name="matches"):
    env = environ.Env()
    url = env("CHALLONGE_DATABASE_URL")
    return MongoClient(host=url)[env("CHALLONGE_DATABASE_NAME")][name]


def get_many(collection, order_by=None, how=-1, silent=True, **kwargs):
    result = get_collection(collection).find(kwargs)
    if order_by:
        return result.sort(order_by, how)
    if not silent and not result:
        raise ValueError(f'No stats found in "{collection}" with {kwargs}')
    return result


def get_stats(collection, silent=False, **kwargs):
    logger.info(f'Getting stats ({kwargs}) from collection "{collection}"')
    if not kwargs:
        raise ValueError("filter kwargs required")
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
        "update": {"$set": stats},
        "upsert": True,
    }
    if not commit:
        return UpdateOne(**update_params)

    return get_collection(collection).update_one(**update_params)
