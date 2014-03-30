###
### Created/Written by John "JFTActual" Thantranon & UniConStudios for MetaEden
### Contact: http://www.about.me/JFT
###

import os
from os import listdir
from os.path import isfile, join
from google.appengine.api import users
from google.appengine.ext import ndb
from google.appengine.api import channel
import jinja2
import webapp2
import json

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'])

##############################
## HELPER FUNCTIONS ##########
##############################

def jsonify(data): # Helper function to quickly turn NDB objects into dictionaries and then dump them into JSON format for easy python/javascript coms.
    if isinstance(data, str): # If already a dumpable format, dumpt it immediately
        return json.dumps(data)
    else: # Else, turn it into a dictionary first
        return json.dumps(data.to_dict())


##############################
## MAIN CLASSES ##############
##############################
class MainPage(webapp2.RequestHandler): # Landing page for TCBEdit, No real use ATM
    def get(self):
        USER = users.get_current_user()
        if USER: # If user logged in and belongs to domains geeks or unicon, allow forward
            EMAIL = USER.email()
            DOMAIN = EMAIL.split("@")[1]
            user = USER.nickname()
            fedID = USER.user_id()
            WHITELIST = ['thesoapboxrevolt@gmail.com','jvthantranon@gmail.com','LaurenNichole.Awesome@gmail.com']
            DOMAINLIST = ['geeksngamers.com','uniconstudios.com','example.com']
            if DOMAIN in DOMAINLIST:
                pass
            elif EMAIL in WHITELIST:
                pass
            else: # Else make them log in. (Loop if wrong domain)
                # self.redirect(users.create_login_url("/"))
                pass
        else: # If wrong domain, login loop
            user = "BADUSER"
            fedID = "BADID"
            EMAIL = "BADEMAIL"
            # self.redirect(users.create_login_url("/"))

        template_values = { 'user': user,
                            'fedID': fedID,
                            'fedMail': EMAIL
                            }
        template = JINJA_ENVIRONMENT.get_template('index.html')
        self.response.write(template.render(template_values))


app = webapp2.WSGIApplication([
    ('/', MainPage), # Landing Page, currently not used
], debug=True)

