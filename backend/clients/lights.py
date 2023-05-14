import operator
import yeelight


class LightsException(Exception):
    pass


class LightsClient:
    @classmethod
    def get_bulbs(cls):
        bulbs = yeelight.discover_bulbs()
        return sorted(bulbs, key=operator.itemgetter("ip"))

    @classmethod
    def set_brightness(cls, ip, brightness):
        bulb = yeelight.Bulb(ip, auto_on=True)
        try:
            return bulb.set_brightness(brightness)
        except yeelight.main.BulbException as e:
            raise LightsException(e)

    @classmethod
    def set_color_temp(cls, ip, color_temp):
        bulb = yeelight.Bulb(ip, auto_on=True)
        try:
            return bulb.set_color_temp(color_temp)
        except yeelight.main.BulbException as e:
            raise LightsException(e)

    @classmethod
    def set_rgb(cls, ip, rgb):
        bulb = yeelight.Bulb(ip, auto_on=True)
        try:
            return bulb.set_rgb(*rgb)
        except yeelight.main.BulbException as e:
            raise LightsException(e)

    @classmethod
    def turn_all_off(cls):
        for bulb in [yeelight.Bulb(bulb["ip"]) for bulb in cls.get_bulbs()]:
            try:
                bulb.turn_off()
            except yeelight.main.BulbException as e:
                raise LightsException(e)

    @classmethod
    def turn_all_on(cls):
        for bulb in [yeelight.Bulb(bulb["ip"]) for bulb in cls.get_bulbs()]:
            try:
                bulb.turn_on()
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
