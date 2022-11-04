importScripts("https://cdn.jsdelivr.net/pyodide/v0.21.3/full/pyodide.js");

function sendPatch(patch, buffers, msg_id) {
  self.postMessage({
    type: 'patch',
    patch: patch,
    buffers: buffers
  })
}

async function startApplication() {
  console.log("Loading pyodide!");
  self.postMessage({type: 'status', msg: 'Loading pyodide'})
  self.pyodide = await loadPyodide();
  self.pyodide.globals.set("sendPatch", sendPatch);
  console.log("Loaded!");
  await self.pyodide.loadPackage("micropip");
  const env_spec = ['https://cdn.holoviz.org/panel/0.14.1/dist/wheels/bokeh-2.4.3-py3-none-any.whl', 'https://cdn.holoviz.org/panel/0.14.1/dist/wheels/panel-0.14.1-py3-none-any.whl', 'pyodide-http==0.1.0', 'notebook', 'pandas', 'numpy', 'matplotlib']
  for (const pkg of env_spec) {
    let pkg_name;
    if (pkg.endsWith('.whl')) {
      pkg_name = pkg.split('/').slice(-1)[0].split('-')[0]
    } else {
      pkg_name = pkg
    }
    self.postMessage({type: 'status', msg: `Installing ${pkg_name}`})
    try {
      await self.pyodide.runPythonAsync(`
        import micropip
        await micropip.install('${pkg}');
      `);
    } catch(e) {
      console.log(e)
      self.postMessage({
	type: 'status',
	msg: `Error while installing ${pkg_name}`
      });
    }
  }
  console.log("Packages loaded!");
  self.postMessage({type: 'status', msg: 'Executing code'})
  const code = `
  
import asyncio

from panel.io.pyodide import init_doc, write_doc

init_doc()

#!/usr/bin/env python
# coding: utf-8

# # Results from our survey
# 
# Here are the results. See our report at: https://results.com

# In[2]:


import panel as pn
import numpy as np
import pandas as pd
import math

from bokeh.palettes import Category20c, Category20
from bokeh.plotting import figure
from bokeh.transform import cumsum

pn.extension()


# ## Where is the surveyed DRI located?

# In[10]:


df = pd.read_csv("http://192.168.50.99:8000/mock_data.tsv", sep="\t")
df


# In[101]:


def readable(txt):
    return txt.replace("_", " ").title()


def get_pie_chart_data(source_data):
    source_field = source_data.lower().replace(" ", "_")
    if source_field not in df.columns:
        raise Exception(f"Unknown column: {source_field}")

    counts = df[source_field].value_counts()
    
    data = pd.Series(counts).reset_index(name='value').rename(columns={'index':source_field})
    data['angle'] = data['value'] / data['value'].sum() * 2 * math.pi
    data['color'] = Category20c[len(data)]
    return data, source_field


# In[102]:


def plot_pie_chart(source_data):
    data, source_field = get_pie_chart_data(source_data)
    p = figure(plot_height=350, title=f"Pie chart of: {source_data}", toolbar_location=None,
               tools="hover", tooltips=f"@{source_field}: @value", x_range=(-0.5, 1.0))

    r = p.wedge(x=0, y=1, radius=0.4,
            start_angle=cumsum('angle', include_zero=True), end_angle=cumsum('angle'),
            line_color="white", fill_color='color', legend_field=source_field, source=data)

    p.axis.axis_label = None
    p.axis.visible = False
    p.grid.grid_line_color = None

    bokeh_pane = pn.pane.Bokeh(p, theme="dark_minimal")
    return bokeh_pane


# In[103]:


# E.g. get some data
data, source_field = get_pie_chart_data("Research Council Funder")
df.columns


# In[131]:


def show_what_should_have_asked(fid):
    resp = df[df.facility_id == f"Fac_0000{fid}"].should_have_asked.iloc[0]
    pane = pn.pane.Markdown(f"Facility **{fid}** said:\\n\\n> '{resp}'")
    return pane

    
fac_id_slider = pn.widgets.IntSlider(name="Select a facility by ID", value=1, start=1, end=len(df))


# In[143]:


text_input = pn.widgets.Select(name='Select data to show in pie chart', 
                               options=sorted([readable(x) for x in df.drop(
                                   columns=['facility_id', 'should_have_asked']).columns]))


# In[156]:


app = pn.GridSpec(sizing_mode='stretch_both', max_width=800)

app[1,:] = pn.pane.Markdown("""
# Welcome to the Net Zero DRI Key Findings website

This page allows you to query the findings in various wonderful ways...
""", min_height=100, style={"padding-bottom": "40px"})

app[2,:] = pn.pane.Markdown("""## Let's look at the distribution of answers for some key question areas""")
app[3:9,:] = pn.Column(text_input, 
                         pn.bind(plot_pie_chart, source_data=text_input))
app[10,:] = pn.Spacer(background="#0000FF", max_height=10)
app[11,:] = pn.pane.Markdown("""### And what did people say we should have asked?""")
app[12,:] = pn.Column(fac_id_slider, pn.bind(show_what_should_have_asked, fac_id_slider))


# In[157]:


app.servable()


# In[ ]:






await write_doc()
  `

  try {
    const [docs_json, render_items, root_ids] = await self.pyodide.runPythonAsync(code)
    self.postMessage({
      type: 'render',
      docs_json: docs_json,
      render_items: render_items,
      root_ids: root_ids
    })
  } catch(e) {
    const traceback = `${e}`
    const tblines = traceback.split('\n')
    self.postMessage({
      type: 'status',
      msg: tblines[tblines.length-2]
    });
    throw e
  }
}

self.onmessage = async (event) => {
  const msg = event.data
  if (msg.type === 'rendered') {
    self.pyodide.runPythonAsync(`
    from panel.io.state import state
    from panel.io.pyodide import _link_docs_worker

    _link_docs_worker(state.curdoc, sendPatch, setter='js')
    `)
  } else if (msg.type === 'patch') {
    self.pyodide.runPythonAsync(`
    import json

    state.curdoc.apply_json_patch(json.loads('${msg.patch}'), setter='js')
    `)
    self.postMessage({type: 'idle'})
  } else if (msg.type === 'location') {
    self.pyodide.runPythonAsync(`
    import json
    from panel.io.state import state
    from panel.util import edit_readonly
    if state.location:
        loc_data = json.loads("""${msg.location}""")
        with edit_readonly(state.location):
            state.location.param.update({
                k: v for k, v in loc_data.items() if k in state.location.param
            })
    `)
  }
}

startApplication()
