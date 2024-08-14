import React, { useState } from 'react'

export const TodoList = () => {
    return (
        <div>
            <div className="page-header">
                <h3 className="page-title">
                    To do List
                </h3>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                    <li className="breadcrumb-item"><a href="!#" onClick={evt =>evt.preventDefault()}>Apps</a></li>
                    <li className="breadcrumb-item active" aria-current="page">To do List</li>
                    </ol>
                </nav>
            </div>
            <div className="row">
                <div className="col-lg-12">
                    <div className="card px-3">
                        <div className="card-body">
                            <h4 className="card-title">Shopping List</h4>
                            <TodoListComponent />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export const TodoListComponent = () => {
    const [todos, setTodos] = useState(null)
    const [inputValue, setInputValue] = useState('')

    const statusChangedHandler = (event, id) => {
        if (!todos?.length) return

        const todo = {...todos[id]};
        todo.isCompleted = event.target.checked;

        const newTodos = [...todos];
        newTodos[id] = todo;

        setTodos(newTodos)
    }

    const addTodo = (event) => {
        event.preventDefault();
        const todo = {
            id: todos?.length ? todos.length + 1 : 1,
            task: inputValue,
            isCompleted: false
        }

        const newTodos = todos?.length ? [...todos, todo] : [todo];

        setTodos(newTodos)
        setInputValue('')
    }

    const removeTodo = (index) => {
        if (!todos?.length) return
        const newTodos = [...todos];
        newTodos.splice(index, 1);
        setTodos(newTodos)
    }

    return (
        <>
            <form  className="add-items d-flex" onSubmit={addTodo}>
                <input
                    type="text"
                    className="form-control h-auto"
                    placeholder="What do you need to do today?"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    required />
                <button type="submit" className="btn btn-primary">Add</button>
            </form>
            <div className="list-wrapper">
                <ul className="d-flex flex-column todo-list">
                    {todos?.map((todo, index) =>{
                        return <ListItem
                        isCompleted={todo.isCompleted}
                        changed={(event) => statusChangedHandler(event, index)}
                        key={todo.id}
                        remove={() => removeTodo(index) }
                        >{todo.task}</ListItem>
                    })}
                </ul>
            </div>
        </>
    )
}

const ListItem = (props) => {
    
    return (
        <li className={(props.isCompleted ? 'completed' : null)}>
            <div className="form-check">
                <label htmlFor="" className="form-check-label"> 
                    <input className="checkbox" type="checkbox" 
                        checked={props.isCompleted} 
                        onChange={props.changed} 
                        /> {props.children} <i className="input-helper" />
                </label>
            </div>
            <i className="remove mdi mdi-close-box" onClick={props.remove} />
        </li>
    )
};

export default TodoList
