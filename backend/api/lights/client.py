import logging
import operator
import yeelight

logger = logging.getLogger(__name__)


class LightsException(Exception):
    pass


class LightsClient:
    @classmethod
    def get_bulbs(cls):
        bulbs = yeelight.discover_bulbs()
        return sorted(bulbs, key=operator.itemgetter("ip"))

    @classmethod
    def set_brightness(cls, ip, brightness):
        bulb = yeelight.Bulb(ip)
        try:
            return bulb.set_brightness(brightness)
        except yeelight.main.BulbException as e:
            raise LightsException(e)

    @classmethod
    def turn_off(cls, ip):
        bulb = yeelight.Bulb(ip)
        try:
            return bulb.turn_off()
        except yeelight.main.BulbException as e:
            raise LightsException(e)

    @classmethod
    def turn_on(cls, ip):
        bulb = yeelight.Bulb(ip)
        try:
            return bulb.turn_on()
        except yeelight.main.BulbException as e:
            raise LightsException(e)

    @classmethod
    def toggle(cls, ip):
        bulb = yeelight.Bulb(ip)
        try:
            return bulb.toggle()
        except yeelight.main.BulbException as e:
            raise LightsException(e)
