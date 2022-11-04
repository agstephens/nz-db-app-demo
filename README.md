# Installing and playing with panel

## Installation

```
python -m venv venv-panel
source venv-panel/bin/activate

pip install -r requirements.txt
```

## Running a basic notebook

On sci3:

firefox &
jupyter notebook --ip=127.0.0.01 --port=8998 &

Will start up and automatically appear in:

http://127.0.0.1:8998/tree

On a Vagrant VM:

jupyter notebook --ip=192.168.50.99 --port=8998 --allow-root

And lock on host server in browser:

http://192.168.50.99:8998/?token=a430dd261b7a9a0b5bffe4cb9afc4896bccc7edf03d7de76

Which forwards to:

http://192.168.50.99:8998/tree

## Working with panel

Copy examples:

panel examples --path ./

And launch with:

jupyter notebook --ip=127.0.0.01 --port=8998 & # or: jupyter lab [+args]

### Cloned the repo to see the examples

git clone https://github.com/holoviz/panel/ holoviz.panel

And then, in the notebook service, you can navigate to examples under: `holoviz.panel/examples`


## Build a simple app

https://panel.holoviz.org/getting_started/build_app.html

Follow the instructions, then add in this cell:

```
first_app.show()
```

It says:

Then, in the browser, go to:

http://127.0.0.1:44425

And there we have the app!

NOTE: on vagrant I needed:

```
import os
os.environ["BOKEH_ALLOW_WS_ORIGIN"] = "192.168.50.99:9009

first_app.show(address="192.168.50.99", port=9009)
```

## Running app from the command-line

cp first_app.ipynb second_app.ipynb

Edit to say:

second_app.servable()

BOKEH_ALLOW_WS_ORIGIN=192.168.50.99:5006 panel serve --address 192.168.50.99 --port 5006 --show second_app.ipynb


## The temporary Net Zero DB app

See: `fourth_app.ipynb`

Run with:

```
BOKEH_ALLOW_WS_ORIGIN=192.168.50.99:5006 panel serve --address 192.168.50.99 --port 5006 --show fourth_app.ipynb
```
## Convert and run without the python server

You can convert into WASM (Web Assembly), see:

https://panel.holoviz.org/user_guide/Running_in_Webassembly.html

First, in the Notebook Service, got to: File -> Download As -> Python (.py)

```
panel convert fourth_app.py --to pyodide-worker --out pyodide --requirements requirements.txt
```

Writes to:

`./pyodide/fourth.html`

It needs the data via a URL, so modify this file to:

```
./pyodide/fourth_app.js:df = pd.read_csv("http://192.168.50.99:8000/mock_data.tsv", sep="\t")
```

Then, to serve it you need to do:

```
python3 -m http.server --bind 192.168.50.99
```

And then it becomes visible in:

http://192.168.50.99:8000/pyodide/fourth_app.html


## References

https://panel.holoviz.org/getting_started/installation.html


